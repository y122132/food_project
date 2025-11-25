import pandas as pd

# 1) 파일 경로 설정
excel_path = "selected_columns_음식DB.csv"   # 엑셀 파일
classes_path = "classes.txt"         # 150개 음식 클래스 이름이 들어 있는 txt

# 2) 엑셀 읽기
df = pd.read_csv(excel_path)

print("컬럼 목록:", df.columns.tolist())

# 3) txt에서 클래스 이름 읽기
with open(classes_path, encoding="utf-8") as f:
    classes = [line.strip() for line in f if line.strip()]

print("클래스 개수:", len(classes))
print("예시 클래스 5개:", classes[:5])

# 4) 대표식품명 / 식품명 기준으로 각각 매칭 시도
filtered_by_rep = None
# filtered_by_name = None

if "대표식품명" in df.columns:
    filtered_by_rep = df[df["대표식품명"].isin(classes)]
    print("대표식품명 기준 매칭 개수:", len(filtered_by_rep))

# if "식품명" in df.columns:
#     filtered_by_name = df[df["식품명"].isin(classes)]
#     print("식품명 기준 매칭 개수:", len(filtered_by_name))

# 5) CSV로 저장
if filtered_by_rep is not None:
    filtered_by_rep.to_csv("filtered_by_대표식품명.csv", index=False, encoding="utf-8-sig")
    print("✅ filtered_by_대표식품명.csv 저장 완료")

# if filtered_by_name is not None:
#     filtered_by_name.to_csv("filtered_by_식품명.csv", index=False, encoding="utf-8-sig")
#     print("✅ filtered_by_식품명.csv 저장 완료")
