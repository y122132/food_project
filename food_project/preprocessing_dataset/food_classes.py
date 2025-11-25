# kfood 폴더에서 클래스 이름 추출하기

import os

# kfood 폴더 경로 (네 환경에 맞게 수정)
root_dir = "kfood"

# 디렉토리만 추출
classes = sorted([
    d for d in os.listdir(root_dir)
    if os.path.isdir(os.path.join(root_dir, d))
])

print("총 클래스 수:", len(classes))
print(classes)

# TXT로 저장 (원하면 CSV도 가능)
with open("classes.txt", "w", encoding="utf-8") as f:
    for c in classes:
        f.write(c + "\n")
