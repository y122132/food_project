import pandas as pd

# 1) 파일 경로 설정
csv_path = "selected_columns_음식DB.csv"   # 엑셀 파일
classes_path = "classes.txt"         # 150개 음식 클래스 이름이 들어 있는 txt

# 2) 엑셀 읽기
df = pd.read_csv(csv_path)

print("컬럼 목록:", df.columns.tolist())

# 3) txt에서 클래스 이름 읽기
with open(classes_path, encoding="utf-8") as f:
    classes = [line.strip() for line in f if line.strip()]

classes_set = set(classes)
print("클래스 개수:", len(classes))
print("예시 클래스 5개:", classes[:5])

# 4) 대표식품명 / 식품명 기준으로 각각 매칭 시도 + 매칭 실패 탐지
if "대표식품명" in df.columns:
    filtered_by_rep = df[df["대표식품명"].isin(classes)]
    print("대표식품명 기준 매칭 개수:", len(filtered_by_rep))

    # 엑셀에서 실제로 매칭된 이름들
    matched_rep_names = set(filtered_by_rep["대표식품명"].unique())

    # 150개 중에서 엑셀에 없는(매칭 실패) 이름들
    unmatched_rep = sorted(list(classes_set - matched_rep_names))

    print("\n[대표식품명 기준] 매칭 실패한 클래스 개수:", len(unmatched_rep))
    print("[대표식품명 기준] 매칭 실패 예시 10개:", unmatched_rep[:10])

    # CSV로 저장
    pd.DataFrame({"unmatched_class": unmatched_rep}).to_csv(
        "unmatched_by_대표식품명.csv", index=False, encoding="utf-8-sig"
    )
    print("✅ unmatched_by_대표식품명.csv 저장 완료")

# if "식품명" in df.columns:
#     filtered_by_name = df[df["식품명"].isin(classes)]
#     print("\n식품명 기준 매칭 개수:", len(filtered_by_name))

#     matched_name_names = set(filtered_by_name["식품명"].unique())
#     unmatched_name = sorted(list(classes_set - matched_name_names))

#     print("\n[식품명 기준] 매칭 실패한 클래스 개수:", len(unmatched_name))
#     print("[식품명 기준] 매칭 실패 예시 10개:", unmatched_name[:10])

#     pd.DataFrame({"unmatched_class": unmatched_name}).to_csv(
#         "unmatched_by_식품명.csv", index=False, encoding="utf-8-sig"
#     )
#     print("✅ unmatched_by_식품명.csv 저장 완료")
