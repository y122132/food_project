import os
from pathlib import Path
from datetime import datetime

import torch
from torch import nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets

from sklearn.model_selection import train_test_split

from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    get_cosine_schedule_with_warmup,
)


# 클래스당 200개 샘플 사용
import random
from collections import defaultdict


# -----------------------------
# 1. 설정값
# -----------------------------
MODEL_NAME = "facebook/convnext-base-224-22k-1k"

DATA_DIR = "kfood"    # ★ 네 음식 이미지 폴더 (train/val 없이 하나)
OUTPUT_DIR = "checkpoints_convnext_stratified"

TEST_SIZE = 0.2         # 80:20 분할
RANDOM_STATE = 42

BATCH_SIZE = 16
NUM_EPOCHS = 2
LR = 5e-5
WEIGHT_DECAY = 1e-4
WARMUP_RATIO = 0.1
NUM_WORKERS = 4
LOG_INTERVAL = 50


# -----------------------------
# 2. 장치 선택
# -----------------------------
def get_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")  # Mac M1/M2 GPU
    else:
        return torch.device("cpu")

device = get_device()
print(f"[INFO] Using device: {device}")


# -----------------------------
# 3. 전체 데이터셋 로드
# -----------------------------
print("[INFO] Loading full dataset...")

full_dataset = datasets.ImageFolder(DATA_DIR)
classes = full_dataset.classes
num_labels = len(classes)

print(f"[INFO] Classes ({num_labels}): {classes}")


# ✅ 여기부터 추가: 클래스당 최대 100장만 사용
MAX_PER_CLASS = 100

class_to_indices = defaultdict(list)
for idx, (_, label) in enumerate(full_dataset.samples):
    class_to_indices[label].append(idx)

selected_indices = []
for label, idx_list in class_to_indices.items():
    if len(idx_list) > MAX_PER_CLASS:
        idx_list = random.sample(idx_list, MAX_PER_CLASS)
    selected_indices.extend(idx_list)

# ImageFolder 내부 samples/ imgs 를 샘플링된 것만 남기기
full_dataset.samples = [full_dataset.samples[i] for i in selected_indices]
full_dataset.imgs = full_dataset.samples

print(f"[INFO] After sampling: total images = {len(full_dataset)}")
# ✅ 여기까지 추가



# -----------------------------
# 4. Stratified Split 수행
# -----------------------------
targets = [label for _, label in full_dataset.samples]   # 각 이미지의 label index 리스트

train_idx, val_idx = train_test_split(
    range(len(full_dataset)),
    test_size=TEST_SIZE,
    stratify=targets,
    random_state=RANDOM_STATE
)

train_dataset = Subset(full_dataset, train_idx)
val_dataset = Subset(full_dataset, val_idx)

print(f"[INFO] Train size: {len(train_dataset)} | Val size: {len(val_dataset)}")


# -----------------------------
# 5. 이미지 전처리기 준비
# -----------------------------
processor = AutoImageProcessor.from_pretrained(MODEL_NAME)

def collate_fn(batch):
    images, labels = zip(*batch)
    inputs = processor(images=list(images), return_tensors="pt")
    inputs["labels"] = torch.tensor(labels, dtype=torch.long)
    return inputs


train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=NUM_WORKERS,
    pin_memory=True,
    collate_fn=collate_fn,
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=True,
    collate_fn=collate_fn,
)


# -----------------------------
# 6. 모델 로드
# -----------------------------
print("[INFO] Loading model...")

model = AutoModelForImageClassification.from_pretrained(
    MODEL_NAME,
    num_labels=num_labels,
    ignore_mismatched_sizes=True,
)
model.to(device)


# -----------------------------
# 7. Optimizer / Scheduler
# -----------------------------
num_update_steps_per_epoch = len(train_loader)
max_train_steps = NUM_EPOCHS * num_update_steps_per_epoch
warmup_steps = int(WARMUP_RATIO * max_train_steps)

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LR,
    weight_decay=WEIGHT_DECAY,
)

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=warmup_steps,
    num_training_steps=max_train_steps,
)


# -----------------------------
# 8. 학습 / 검증 루프
# -----------------------------
os.makedirs(OUTPUT_DIR, exist_ok=True)
best_val_acc = 0.0

def train_one_epoch(epoch):
    model.train()
    running_loss = 0
    correct = 0
    total = 0

    for step, batch in enumerate(train_loader, start=1):
        batch = {k: v.to(device) for k, v in batch.items()}

        outputs = model(**batch)
        loss = outputs.loss
        logits = outputs.logits

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        scheduler.step()

        running_loss += loss.item() * batch["labels"].size(0)

        preds = logits.argmax(dim=-1)
        correct += (preds == batch["labels"]).sum().item()
        total += batch["labels"].size(0)

        if step % LOG_INTERVAL == 0:
            current_lr = scheduler.get_last_lr()[0]
            print(f"[Train] Epoch {epoch} Step {step}/{len(train_loader)} "
                  f"Loss: {loss.item():.4f} LR: {current_lr:.2e}")

    return running_loss / total, correct / total


@torch.no_grad()
def evaluate():
    model.eval()
    running_loss = 0
    correct = 0
    total = 0

    for batch in val_loader:
        batch = {k: v.to(device) for k, v in batch.items()}

        outputs = model(**batch)
        loss = outputs.loss
        logits = outputs.logits

        running_loss += loss.item() * batch["labels"].size(0)

        preds = logits.argmax(dim=-1)
        correct += (preds == batch["labels"]).sum().item()
        total += batch["labels"].size(0)

    return running_loss / total, correct / total


print("[INFO] Start training...")
start_time = datetime.now()

for epoch in range(1, NUM_EPOCHS + 1):
    train_loss, train_acc = train_one_epoch(epoch)
    val_loss, val_acc = evaluate()

    print(
        f"\n[Epoch {epoch}] "
        f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.3f} | "
        f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.3f}\n"
    )

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        save_path = os.path.join(OUTPUT_DIR, f"best_model.pt")
        torch.save(
            {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "scheduler_state_dict": scheduler.state_dict(),
                "val_acc": val_acc,
                "classes": classes,
                "model_name": MODEL_NAME,
            },
            save_path,
        )
        print(f"[INFO] New best model saved to: {save_path}")

end_time = datetime.now()
print(f"[INFO] Training finished. Total time: {end_time - start_time}")
print(f"[INFO] Best validation accuracy: {best_val_acc:.3f}")
