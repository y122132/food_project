import pandas as pd
from rapidfuzz import process, fuzz

# 1) 파일 경로 설정
csv_path = "selected_columns_음식DB.csv"
unmatched_path = "unmatched_by_대표식품명.csv"

# 2) 엑셀 / unmatched 목록 읽기
df = pd.read_csv(csv_path)
unmatched_df = pd.read_csv(unmatched_path)

# 3) 대표식품명 리스트 준비
if "대표식품명" not in df.columns:
    raise ValueError("엑셀에 '대표식품명' 컬럼이 없습니다. 컬럼 이름을 확인하세요.")

rep_names = df["대표식품명"].astype(str).unique().tolist()

print("대표식품명 개수:", len(rep_names))
print("unmatched 개수:", len(unmatched_df))

# 4) 각 unmatched 클래스에 대해 비슷한 대표식품명 추천
results = []

TOP_N = 5  # 클래스당 추천할 후보 개수

for cls in unmatched_df["unmatched_class"]:
    target = str(cls)

    # rapidfuzz로 상위 TOP_N 비슷한 대표식품명 찾기
    matches = process.extract(
        target,
        rep_names,
        scorer=fuzz.WRatio,   # 종합적인 문자열 유사도 점수
        limit=TOP_N
    )

    # matches: [(matched_name, score, index), ...]
    for matched_name, score, _ in matches:
        results.append({
            "unmatched_class": target,
            "candidate_대표식품명": matched_name,
            "similarity_score": score
        })

# 5) 결과를 DataFrame으로 정리 & CSV 저장
suggest_df = pd.DataFrame(results)
suggest_df = suggest_df.sort_values(
    ["unmatched_class", "similarity_score"], ascending=[True, False]
)

# output_path = "추천_대표식품명_유사도기반(대표식품명).csv"
# suggest_df.to_csv(output_path, index=False, encoding="utf-8-sig")

# print(f"✅ 추천 결과 저장 완료: {output_path}")
# print(suggest_df.head(20))



# 자동 매핑(유사도 90 이상)
auto_df = suggest_df[suggest_df["similarity_score"] >= 90]
final_auto_map = auto_df[["unmatched_class", "candidate_대표식품명"]].rename(
    columns={
        "unmatched_class": "food_class",
        "candidate_대표식품명": "대표식품명"
    }
)

final_auto_map.to_csv("자동매핑.csv", index=False, encoding="utf-8-sig")
print("✅ 자동매핑.csv 저장 완료")


# 수동 매핑(유사도 90 이하)
manual_candidates = suggest_df[suggest_df["similarity_score"] < 90]
TOP_N = 3  # 클래스당 보여줄 후보 개수 (원하면 5로 늘려도 됨)

rows = []
for food_class, group in manual_candidates.groupby("unmatched_class"):
    # 유사도 높은 순으로 정렬해서 TOP_N만
    top = group.sort_values("similarity_score", ascending=False).head(TOP_N)

    row = {"food_class": food_class}
    for i, (_, r) in enumerate(top.iterrows(), start=1):
        row[f"cand{i}_대표식품명"] = r["candidate_대표식품명"]
        row[f"cand{i}_score"] = r["similarity_score"]
    rows.append(row)

manual_template = pd.DataFrame(rows)

# 사람이 최종으로 고를 컬럼 추가
manual_template["final_대표식품명"] = ""

manual_template.to_csv("수동매핑_템플릿.csv", index=False, encoding="utf-8-sig")
print("✅ 수동매핑_템플릿.csv 저장 완료")
