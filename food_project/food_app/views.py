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
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from transformers import AutoImageProcessor, AutoModelForImageClassification

# --- Model and Service Imports ---
from .models import UserProfile, Food, UserFoodPreference, Allergen
from .serializers import UserProfileSerializer, AllergenSerializer, UserFoodPreferenceSerializer
from .models import Meal
from .serializers import MealSerializer
from .vector_service import query_similar_foods

#Auth
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from datetime import datetime
from django.contrib.auth.models import User
from .serializers import UserSerializer

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated]) # Changed to IsAuthenticated to prevent spam
def allergen_list_view(request):
    """
    GET: 모든 알러지 태그 목록 반환
    POST: 새로운 알러지 태그 생성
    """
    if request.method == "GET":
        allergens = Allergen.objects.all()
        serializer = AllergenSerializer(allergens, many=True)
        return Response(serializer.data)
    
    elif request.method == "POST":
        name = request.data.get("name")
        if not name:
            return Response({"detail": "name 필드는 필수입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or Create to avoid duplicates
        allergen, created = Allergen.objects.get_or_create(name=name)
        serializer = AllergenSerializer(allergen)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def allergen_delete_view(request, pk):
    """
    특정 알러지 태그 삭제
    """
    try:
        allergen = Allergen.objects.get(pk=pk)
        allergen.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Allergen.DoesNotExist:
        return Response({"detail": "해당 알러지 태그를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

# ============================================
# NEW: RAG 기반 메뉴 추천 API
# ============================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recommend_menu_view(request):
    """
    RAG 기반으로 사용자에게 메뉴를 추천합니다. (고도화 버전)
    오늘의 섭취량을 분석하여 프롬프트에 포함합니다.
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
        liked_food_prefs = UserFoodPreference.objects.filter(user_profile=profile, preference='LIKE') # NEW
        disliked_food_ids = [pref.food.id for pref in disliked_food_prefs]

        # --- NEW: 오늘의 섭취량 계산 ---
        today = timezone.now().date()
        todays_meals = Meal.objects.filter(user=user, created_at__date=today).prefetch_related('items__food')
        
        total_kcal = 0
        total_carbs = 0
        total_protein = 0
        total_fat = 0

        for meal in todays_meals:
            for item in meal.items.all():
                ratio = item.weight_g / 100.0
                if item.food:
                    total_kcal += (item.food.energy_kcal or 0) * ratio
                    total_carbs += (item.food.carbohydrate_g or 0) * ratio
                    total_protein += (item.food.protein_g or 0) * ratio
                    total_fat += (item.food.fat_g or 0) * ratio
        
        # 영양소 총합 및 비율 계산
        total_macros = total_carbs + total_protein + total_fat
        carb_percent = int((total_carbs / total_macros) * 100) if total_macros > 0 else 0
        protein_percent = int((total_protein / total_macros) * 100) if total_macros > 0 else 0
        fat_percent = 100 - carb_percent - protein_percent if total_macros > 0 else 0

        nutrition_summary = {
            "total_kcal": round(total_kcal),
            "recommended_kcal": profile.get_recommended_kcal(),
            "carb_percent": carb_percent,
            "protein_percent": protein_percent,
            "fat_percent": fat_percent
        }
        # --- 계산 완료 ---

        # 2. 유사 음식 검색 (Vector DB)
        candidate_food_ids = query_similar_foods(query_text, n_results=20)
        if not candidate_food_ids:
             return Response({"recommendation": "관련된 음식을 찾지 못했습니다. 다른 표현으로 질문해주세요."})

        # 3. 후보 상세 정보 조회 (RDB) - 필터링은 LLM에 위임
        candidates = Food.objects.filter(id__in=candidate_food_ids)
        
        # LLM에 전달할 최종 후보 (상위 5개)
        final_candidates_for_llm = list(candidates[:5]) 

        if not final_candidates_for_llm:
            return Response({"recommendation": "관련된 음식을 찾지 못했습니다. 다른 표현으로 질문해주세요."})

        # 4. LLM 프롬프트 구성 및 생성 (영양 정보 요약, 알러지, 비선호 음식 전달)
        # build_recommendation_prompt 함수가 user_allergies와 disliked_food_prefs를 받도록 수정
        prompt = build_recommendation_prompt(
            user, 
            profile, 
            query_text, 
            final_candidates_for_llm, 
                        nutrition_summary,
                        user_allergies,
                        disliked_food_prefs,
                        liked_food_prefs # NEW: Pass liked_food_prefs
                    )        
        # --- 디버그 용: 생성된 프롬프트 출력 ---
        print("--- LLM Prompt Start ---")
        print(prompt)
        print("--- LLM Prompt End ---")
        # -------------------------------------
        
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            completion = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "당신은 사용자의 영양 상태와 요청을 분석하여 개인화된 메뉴를 추천하는 최고의 영양사입니다."},
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


def build_recommendation_prompt(user, profile, query_text, candidates: list[Food], nutrition_summary: dict, user_allergies, disliked_food_prefs, liked_food_prefs) -> str:
    """LLM에게 전달할 상세한 프롬프트를 생성합니다. (고도화 버전)"""
    
    candidate_details = []
    for food in candidates:
        details = (
            f"- 음식명: {food.representative_name}\n"
            f"  - 설명: {food.description}\n"
            f"  - 100g당 영양성분: {food.energy_kcal}kcal, 탄수화물 {food.carbohydrate_g}g, 단백질 {food.protein_g}g, 지방 {food.fat_g}g\n"
            f"  - 맛 특징: {', '.join(food.taste_profile)}\n"
            f"  - 관련 상황: {', '.join(food.situational_tags)}"
            # NEW: 음식 자체의 알러지 정보도 LLM에 전달
            f"  - 음식 알러지 유발 항원: {', '.join([a.name for a in food.allergens.all()]) if food.allergens.exists() else '없음'}"
        )
        candidate_details.append(details)
    
    constraints = []
    if profile.is_vegetarian:
        constraints.append("채식주의자입니다.")
    if user_allergies.exists():
        allergy_names = ", ".join([allergen.name for allergen in user_allergies.all()])
        constraints.append(f"'{allergy_names}'에 알러지가 있습니다.")
    
    if disliked_food_prefs.exists():
        disliked_food_names = ", ".join([pref.food.representative_name for pref in disliked_food_prefs])
        constraints.append(f"'{disliked_food_names}'을(를) 싫어합니다.")

    if liked_food_prefs.exists(): # NEW: Add liked foods to constraints
        liked_food_names = ", ".join([pref.food.representative_name for pref in liked_food_prefs])
        constraints.append(f"'{liked_food_names}'을(를) 선호합니다. 가능한 이 음식들을 우선적으로 고려하거나 이와 유사한 것을 추천해주세요.")

    # --- NEW: 영양 상태 분석 문구 생성 ---
    remaining_kcal = (nutrition_summary['recommended_kcal'] or 2000) - nutrition_summary['total_kcal']
    
    nutrition_analysis = (
        f"- 현재까지 섭취한 총 칼로리는 약 {nutrition_summary['total_kcal']}kcal 입니다. (권장: {nutrition_summary['recommended_kcal']}kcal)\n"
        f"- 남은 칼로리는 약 {remaining_kcal}kcal 입니다.\n"
        f"- 현재까지의 영양소 섭취 비율은 탄수화물 {nutrition_summary['carb_percent']}%, 단백질 {nutrition_summary['protein_percent']}%, 지방 {nutrition_summary['fat_percent']}% 입니다."
    )

    macro_guidance = ""
    if nutrition_summary['protein_percent'] < 25 and nutrition_summary['total_kcal'] > 300:
        macro_guidance = "특히 단백질 섭취가 부족해 보이니, 단백질 함량이 높은 메뉴를 우선적으로 고려해주세요."
    elif nutrition_summary['carb_percent'] > 65 and nutrition_summary['total_kcal'] > 300:
        macro_guidance = "탄수화물 섭취 비중이 높아 보이니, 탄수화물이 적은 메뉴를 우선적으로 고려해주세요."
    # --- 문구 생성 완료 ---

    prompt = f"""
    # 임무
    당신은 사용자의 현재 영양 상태, 요청사항, 선호도, 그리고 우리가 찾아낸 음식 후보 목록을 종합하여, 가장 적합한 메뉴 한두 가지를 추천하고 그 이유를 친절하게 설명해야 합니다.

    # 사용자 정보
    - 이름: {user.username}
    - 요청사항: "{query_text}"
    - 제약조건: {', '.join(constraints) if constraints else "특별한 제약 없음"}

    # 사용자의 현재 영양 상태 분석
    {nutrition_analysis}
    {macro_guidance}

    # 추천할 음식 후보 목록
    다음은 사용자의 요청과 관련성이 높고, 제약조건을 만족하는 음식 후보 목록입니다. 각 음식의 영양성분은 100g 기준입니다.
    {'\n'.join(candidate_details)}

    # 최종 지시
    위 정보를 바탕으로, 다음 규칙을 지켜 답변해주세요:
    1. **사용자의 현재 영양 상태**와 **남은 칼로리**를 최우선으로 고려하여 후보 중에서 1~2개의 메뉴를 최종 추천해주세요.
    2. 왜 그 메뉴를 추천하는지, 사용자의 요청 및 **영양학적 분석**과 연결지어 쉽고 친절하게 설명해주세요. (예: "단백질이 부족하셨는데, 이 메뉴는 1인분에 단백질 XXg을 보충해줄 수 있어요.")
    3. 답변은 반드시 한국어로, 전문적이면서도 친구에게 말하듯 부드러운 말투로 작성해주세요.
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
        meals = Meal.objects.filter(user=user, created_at__date=target_date).prefetch_related('items__food').order_by("created_at")
        
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

# === NEW: User Food Preference Views ===
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def user_food_preference_list_create_view(request):
    user_profile = get_object_or_404(UserProfile, user=request.user)

    if request.method == "GET":
        preferences = UserFoodPreference.objects.filter(user_profile=user_profile)
        serializer = UserFoodPreferenceSerializer(preferences, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        food_id = request.data.get("food_id")
        preference = request.data.get("preference") # 'LIKE' or 'DISLIKE'

        if not food_id or not preference:
            return Response({"detail": "food_id와 preference는 필수입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        if preference not in ['LIKE', 'DISLIKE']:
            return Response({"detail": "preference는 'LIKE' 또는 'DISLIKE'여야 합니다."}, status=status.HTTP_400_BAD_REQUEST)

        food = get_object_or_404(Food, id=food_id)

        # Update or create the preference
        obj, created = UserFoodPreference.objects.update_or_create(
            user_profile=user_profile,
            food=food,
            defaults={'preference': preference}
        )
        serializer = UserFoodPreferenceSerializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def user_food_preference_delete_view(request, food_id):
    user_profile = get_object_or_404(UserProfile, user=request.user)
    food = get_object_or_404(Food, id=food_id)

    try:
        preference = UserFoodPreference.objects.get(user_profile=user_profile, food=food)
        preference.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserFoodPreference.DoesNotExist:
        return Response({"detail": "해당 음식 선호도를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# 1. 경로 설정 (프로젝트 루트 기준)
# ============================================
BASE_DIR = settings.BASE_DIR

CKPT_PATH = os.path.join(
    BASE_DIR, "checkpoints_convnext_stratified", "best_model.pt"
)

# ============================================
# 2. 모델 / 프로세서 전역 로드
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
    """대표식품명(food_class) → 해당하는 식품명 목록 (DB 사용)"""
    foods = Food.objects.filter(food_class=pred_class).values(
        'id', 'representative_name', 'food_class'
    ).distinct()
    return list(foods)


# ============================================
# 3. API: 이미지 → 대표식품명 + 식품명 후보
# ============================================
@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated]) # 이제 DB 조회가 필요하므로 인증된 사용자만
def predict_food(request):
    """
    POST /api/predict/
    - form-data: image (파일)
    응답:
    {
      "pred_class": "국밥",
      "food_options": [{ "id": 1, "representative_name": "...", "food_class": "..." }, ...]
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
@permission_classes([IsAuthenticated])
def food_options(request):
    """
    GET /api/food-options/?class=국밥 OR /api/food-options/?name=김치찌개
    Search for food options by class or by name.
    """
    food_class = request.query_params.get("class")
    food_name = request.query_params.get("name")
    
    if not food_class and not food_name:
        return Response({"detail": "class 또는 name 파라미터 중 하나는 필수입니다."}, status=status.HTTP_400_BAD_REQUEST)

    foods_queryset = Food.objects.all()

    if food_class:
        foods_queryset = foods_queryset.filter(food_class=food_class)
    
    if food_name:
        foods_queryset = foods_queryset.filter(representative_name__icontains=food_name)

    options = foods_queryset.values('id', 'representative_name', 'food_class').distinct()
    
    return Response(
        {
            "pred_class": food_class or "", # Return class if searched by class, empty otherwise
            "food_options": list(options),
        }
    )


# ============================================
# 5. API: 식품 ID + 중량 → 영양성분 계산
# ============================================
@api_view(["POST"])
@parser_classes([JSONParser])
@permission_classes([IsAuthenticated])
def calc_nutrition_view(request):
    """
    POST /api/calc-nutrition/
    JSON:
    {
      "food_id": 123,
      "weight_g": 300
    }
    """
    food_id = request.data.get("food_id")
    weight_g = request.data.get("weight_g")

    if not all([food_id, weight_g]):
        return Response(
            {"detail": "food_id, weight_g가 모두 필요합니다."},
            status=400,
        )

    try:
        weight_g = float(weight_g)
        food = Food.objects.get(id=food_id)
    except ValueError:
        return Response({"detail": "weight_g는 숫자여야 합니다."}, status=400)
    except Food.DoesNotExist:
        return Response({"detail": "해당 식품을 찾을 수 없습니다."}, status=404)

    base_g = 100.0
    ratio = weight_g / base_g

    # Explicitly list the nutrition fields to prevent meta-API errors
    nutrition_fields = [
        'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g', 
        'sugars_g' 
        # Add other fields from the Food model as needed, e.g., 'dietary_fiber_g', 'sodium_mg'
    ]

    nutrition = {}
    for field_name in nutrition_fields:
        base_value = getattr(food, field_name, None)
        if base_value is not None:
            # Format to 2 decimal places for consistency
            nutrition[field_name] = round(base_value * ratio, 2)
        else:
            nutrition[field_name] = None
    
    # Return raw keys (e.g., 'energy_kcal') so frontend can parse them correctly
    return Response(
        {
            "food_id": food.id,
            "representative_name": food.representative_name,
            "base_g": base_g,
            "input_g": weight_g,
            "nutrition": nutrition, 
        }
    )
