# food_app/views.py
import os
import re
import pandas as pd
import torch
from PIL import Image

from django.conf import settings
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from transformers import AutoImageProcessor, AutoModelForImageClassification

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
