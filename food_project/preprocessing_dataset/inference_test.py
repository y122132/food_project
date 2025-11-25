import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

# ---------------------------------------------------------
# 1) best_model.pt 경로
# ---------------------------------------------------------
CKPT_PATH = "checkpoints_convnext_stratified/best_model.pt"

# ---------------------------------------------------------
# 2) 체크포인트 로드
# ---------------------------------------------------------
print("[INFO] 로드 중:", CKPT_PATH)
ckpt = torch.load(CKPT_PATH, map_location="cpu")

classes = ckpt["classes"]
model_name = ckpt["model_name"]

print(f"[INFO] 모델 기반: {model_name}")
print(f"[INFO] 클래스 수: {len(classes)}")

# ---------------------------------------------------------
# 3) 모델 생성 + state_dict 로드
# ---------------------------------------------------------
model = AutoModelForImageClassification.from_pretrained(
    model_name,
    num_labels=len(classes),
    ignore_mismatched_sizes=True
)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()

# ---------------------------------------------------------
# 4) 이미지 전처리기 생성
# ---------------------------------------------------------
processor = AutoImageProcessor.from_pretrained(model_name)

# ---------------------------------------------------------
# 5) 예측 함수
# ---------------------------------------------------------
def predict(image_path: str):
    print(f"\n[INFO] 이미지 불러오는 중: {image_path}")
    img = Image.open(image_path).convert("RGB")

    # 이미지 전처리
    inputs = processor(images=img, return_tensors="pt")

    # 모델 추론
    with torch.no_grad():
        logits = model(**inputs).logits

    pred_idx = logits.argmax(dim=-1).item()
    pred_class = classes[pred_idx]

    print(f"[INFO] 예측 클래스: {pred_class}")
    return pred_class

# ---------------------------------------------------------
# 6) 테스트
# ---------------------------------------------------------
if __name__ == "__main__":
    # 🔥 여기에 테스트할 이미지 파일 경로 넣으면 됨
    test_image = "test.jpg"

    pred = predict(test_image)
    print("\n=== 최종 예측 결과 ===")
    print("예측된 음식:", pred)
