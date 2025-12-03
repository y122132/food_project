# food_app/views.py
import os
import re
import pandas as pd
import torch
from PIL import Image
import json
from openai import OpenAI

from django.conf import settings
from rest_framework.decorators import api_view, parser_classes, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from django.contrib.auth import login
from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from transformers import AutoImageProcessor, AutoModelForImageClassification

# --- Model and Service Imports ---
from .models import UserProfile, Food, UserFoodPreference
from .serializers import UserProfileSerializer
from .models import Meal
from .serializers import MealSerializer
from .vector_service import query_similar_foods

#Auth
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from datetime import datetime
from django.contrib.auth.models import User
from .serializers import UserSerializer

# ============================================
# NEW: RAG 기반 메뉴 추천 API
# ============================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recommend_menu_view(request):
    """
    RAG 기반으로 사용자에게 메뉴를 추천합니다.
    POST /api/recommend-menu/
    JSON:
    {
      "query": "비오고 꿀꿀한 날에 먹을만한 따뜻한 국물 요리 추천해줘"
    }
    """
    user = request.user
    query_text = request.data.get("query")

    if not query_text:
        return Response({"detail": "'query'는 필수 항목입니다."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 1. 사용자 정보 및 제약 조건 조회 (RDB)
        profile = UserProfile.objects.get(user=user)
        user_allergies = profile.allergies.all()
        disliked_food_prefs = UserFoodPreference.objects.filter(user_profile=profile, preference='DISLIKE')
        disliked_food_ids = [pref.food.id for pref in disliked_food_prefs]

        # 2. 유사 음식 검색 (Vector DB)
        # 의미적으로 관련된 음식 후보 20개를 가져옵니다.
        candidate_food_ids = query_similar_foods(query_text, n_results=20)
        if not candidate_food_ids:
             return Response({"recommendation": "관련된 음식을 찾지 못했습니다. 다른 표현으로 질문해주세요."})

        # 3. 후보 필터링 및 상세 정보 조회 (RDB)
        # Vector DB에서 받은 ID로 RDB에서 음식 상세 정보를 가져옵니다.
        candidates = Food.objects.filter(id__in=candidate_food_ids)
        
        # 알러지 및 비선호 음식 필터링
        if user_allergies.exists():
            candidates = candidates.exclude(allergens__in=user_allergies)
        if disliked_food_ids:
            candidates = candidates.exclude(id__in=disliked_food_ids)
        
        # 채식주의자 옵션 필터링 (예시, Food 모델에 is_vegetarian 필드가 있다고 가정)
        # if profile.is_vegetarian:
        #     candidates = candidates.filter(is_vegetarian=True)

        # 최종 후보 5개로 제한
        final_candidates = list(candidates[:5])
        
        if not final_candidates:
            return Response({"recommendation": "조건에 맞는 음식을 찾지 못했습니다. 알러지나 선호도를 확인해주세요."})

        # 4. LLM 프롬프트 구성 및 생성
        prompt = build_recommendation_prompt(user, profile, query_text, final_candidates)
        
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            completion = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "당신은 사용자의 상황과 음식 데이터를 기반으로 개인화된 메뉴를 추천하는 친절한 영양사입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
            )
            recommendation = completion.choices[0].message.content
        except Exception as e:
            return Response({"detail": f"OpenAI API 호출 중 오류 발생: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 5. 결과 반환
        return Response({"recommendation": recommendation})

    except UserProfile.DoesNotExist:
        return Response({"detail": "사용자 프로필을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"detail": f"추천 생성 중 알 수 없는 오류 발생: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def build_recommendation_prompt(user, profile, query_text, candidates: list[Food]) -> str:
    """LLM에게 전달할 상세한 프롬프트를 생성합니다."""
    
    # 후보 음식 정보 포맷팅
    candidate_details = []
    for food in candidates:
        details = (
            f"- 음식명: {food.representative_name}\n"
            f"  - 설명: {food.description}\n"
            f"  - 맛 특징: {', '.join(food.taste_profile)}\n"
            f"  - 관련 상황: {', '.join(food.situational_tags)}"
        )
        candidate_details.append(details)
    
    # 사용자 제약조건 텍스트화
    constraints = []
    if profile.is_vegetarian:
        constraints.append("채식주의자입니다.")
    if profile.allergies.exists():
        allergy_names = ", ".join([allergen.name for allergen in profile.allergies.all()])
        constraints.append(f"'{allergy_names}'에 알러지가 있습니다.")

    prompt = f"""
    # 임무
    당신은 사용자의 현재 상황과 선호도, 그리고 우리가 찾아낸 음식 후보 목록을 종합하여, 가장 적합한 메뉴 한두 가지를 추천하고 그 이유를 친절하게 설명해야 합니다.

    # 사용자 정보
    - 이름: {user.username}
    - 요청사항: "{query_text}"
    - 제약조건: {', '.join(constraints) if constraints else "특별한 제약 없음"}

    # 추천할 음식 후보 목록
    다음은 사용자의 요청과 관련성이 높고, 제약조건을 만족하는 음식 후보 목록입니다.
    {'\n'.join(candidate_details)}

    # 최종 지시
    위 정보를 바탕으로, 다음 규칙을 지켜 답변해주세요:
    1. 후보 목록 중에서 1~2개의 메뉴를 최종 추천해주세요.
    2. 왜 그 메뉴를 추천하는지, 사용자의 요청 및 상황과 연결지어 쉽고 친절하게 설명해주세요.
    3. 추천하는 메뉴 외에, 후보 목록에 있는 다른 메뉴도 "이런 메뉴도 있어요" 와 같이 가볍게 언급해줄 수 있습니다.
    4. 답변은 반드시 한국어로, 친구에게 말하듯 부드러운 말투로 작성해주세요.
    """
    return prompt


# Auth 관련 뷰
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register_view(request):
    """
    회원가입: username, password, email(optional)
    """
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email", "")

    if not username or not password:
        return Response(
            {"detail": "username과 password는 필수입니다."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"detail": "이미 존재하는 사용자명입니다."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(username, email=email, password=password)
    # 프로필 자동 생성 (signals 써도 되고, 여기서 해도 됨)
    UserProfile.objects.get_or_create(user=user)

    # ✅ 회원가입 후 바로 로그인 세션 생성
    login(request, user)

    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    """
    로그인: username, password
    세션 기반 로그인 (쿠키)
    """
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "아이디 또는 비밀번호가 올바르지 않습니다."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    login(request, user)
    serializer = UserSerializer(user)
    return Response(serializer.data)

@api_view(["POST"])
def logout_view(request):
    """
    로그아웃
    """
    logout(request)
    return Response({"detail": "로그아웃 되었습니다."})


# user profile
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    현재 로그인한 유저의 UserProfile 조회/수정
    GET: 정보 + recommended_kcal 반환
    PUT: 정보 수정
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == "GET":
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    # PUT
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 한끼식사 저장
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def meal_list_create_view(request):
    user = request.user

    if request.method == "GET":
        # Get date from query params, default to today
        date_str = request.query_params.get('date', None)
        
        target_date = timezone.now().date()
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                # Handle invalid date format, default to today
                pass

        # Filter meals for the target date
        meals = Meal.objects.filter(user=user, created_at__date=target_date).order_by("created_at")
        
        serializer = MealSerializer(meals, many=True)
        return Response(serializer.data)

    # POST: 새 식사 저장
    serializer = MealSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        meal_instance = serializer.save() # Get the saved meal instance
        
        # If the meal now has no items, delete the meal itself
        if not meal_instance.items.exists():
            meal_instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT) # Return 204 No Content for successful deletion
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# 1. 경로 설정 (프로젝트 루트 기준)
# ============================================
BASE_DIR = settings.BASE_DIR

CKPT_PATH = os.path.join(
    BASE_DIR, "checkpoints_convnext_stratified", "best_model.pt"
)
NUT_DB_PATH = os.path.join(
    BASE_DIR, "data", "클래스별_최종_영양DB.csv"
)

# ============================================
# 2. 모델 / 프로세서 / 영양 DB 전역 로드
#    (서버 시작 시 한 번만 실행)
# ============================================
print("[INFO] Loading checkpoint:", CKPT_PATH)
ckpt = torch.load(CKPT_PATH, map_location="cpu")

CLASSES = ckpt["classes"]
MODEL_NAME = ckpt["model_name"]

model = AutoModelForImageClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(CLASSES),
    ignore_mismatched_sizes=True,
)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()

processor = AutoImageProcessor.from_pretrained(MODEL_NAME)

print("[INFO] Loading nutrition DB:", NUT_DB_PATH)
nutrition_df = pd.read_csv(NUT_DB_PATH, encoding="utf-8-sig")

# 사용할 영양소 컬럼
NUTRITION_COLS = [
    "에너지(kcal)",
    "단백질(g)",
    "지방(g)",
    "탄수화물(g)",
    "당류(g)",
    "식이섬유(g)",
    "칼슘(mg)",
    "철(mg)",
    "나트륨(mg)",
    "비타민 A(μg RAE)",
    "비타민 D(μg)",
    "비타민 C(mg)",
    "콜레스테롤(mg)",
    "포화지방산(g)",
    "트랜스지방산(g)",
]

# (선택) “영양성분함량기준” 같은 컬럼이 있다면 쓸 수 있는 파서
def parse_base_grams(value: str, default: float = 100.0) -> float:
    if not isinstance(value, str):
        return default
    v = value.replace("그램", "g")
    m = re.search(r"([\d\.]+)\s*g", v)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return default
    return default


def predict_class_from_pil(img: Image.Image) -> str:
    """PIL 이미지 → 대표식품명(food_class) 예측"""
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
    pred_idx = logits.argmax(-1).item()
    return CLASSES[pred_idx]


def get_food_options_by_class(pred_class: str):
    """대표식품명(food_class) → 해당하는 식품명 목록"""
    df = nutrition_df[nutrition_df["food_class"] == pred_class]
    options = (
        df[["식품명", "식품중분류명"]]
        .drop_duplicates(subset=["식품명"])
        .to_dict(orient="records")
    )
    return options


# ============================================
# 3. API: 이미지 → 대표식품명 + 식품명 후보
# ============================================
@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def predict_food(request):
    """
    POST /api/predict/
    - form-data: image (파일)
    응답:
    {
      "pred_class": "국밥",
      "food_options": [{ "식품명": "...", "식품중분류명": "..." }, ...]
    }
    """
    img_file = request.FILES.get("image")
    if not img_file:
        return Response(
            {"detail": "image 파일이 필요합니다."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    img = Image.open(img_file).convert("RGB")
    pred_class = predict_class_from_pil(img)
    options = get_food_options_by_class(pred_class)

    return Response(
        {
            "pred_class": pred_class,
            "food_options": options,
        }
    )


# ============================================
# 4. API: 대표식품명 → 식품명 리스트 (옵션)
# ============================================
@api_view(["GET"])
def food_options(request):
    """
    GET /api/food-options/?class=국밥
    """
    rep = request.query_params.get("class")
    if not rep:
        return Response({"detail": "class 파라미터가 필요합니다."}, status=400)

    options = get_food_options_by_class(rep)
    return Response(
        {
            "pred_class": rep,
            "food_options": options,
        }
    )


# ============================================
# 5. API: 식품명 + 중량 → 영양성분 계산
# ============================================
@api_view(["POST"])
@parser_classes([JSONParser])
def calc_nutrition_view(request):
    """
    POST /api/calc-nutrition/
    JSON:
    {
      "pred_class": "국밥",
      "food_name": "국밥_순대국밥",
      "weight_g": 300
    }
    """
    pred_class = request.data.get("pred_class")
    food_name = request.data.get("food_name")
    weight_g = request.data.get("weight_g")

    if not all([pred_class, food_name, weight_g]):
        return Response(
            {"detail": "pred_class, food_name, weight_g가 모두 필요합니다."},
            status=400,
        )

    try:
        weight_g = float(weight_g)
    except ValueError:
        return Response({"detail": "weight_g는 숫자여야 합니다."}, status=400)

    rows = nutrition_df[
        (nutrition_df["food_class"] == pred_class)
        & (nutrition_df["식품명"] == food_name)
    ]
    if rows.empty:
        return Response({"detail": "해당 식품의 영양정보를 찾을 수 없습니다."}, status=404)

    row = rows.iloc[0]

    # TODO: 너의 CSV에 '영양성분함량기준'이 있다면 이걸로 바꾸기
    # base_g = parse_base_grams(row.get("영양성분함량기준", ""), default=100.0)
    base_g = 100.0
    ratio = weight_g / base_g

    nutrition = {}
    for col in NUTRITION_COLS:
        val = row.get(col)
        nutrition[col] = float(val) * ratio if pd.notna(val) else None

    return Response(
        {
            "pred_class": pred_class,
            "food_name": food_name,
            "base_g": base_g,
            "input_g": weight_g,
            "nutrition": nutrition,
        }
    )
