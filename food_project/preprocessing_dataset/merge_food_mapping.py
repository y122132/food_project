import pandas as pd

# ---------------------------
# 0. 파일 경로 설정
# ---------------------------
classes_path = "classes.txt"                        # 폴더에서 뽑은 전체 클래스 (1540개)
db_path = "selected_columns_음식DB.csv"             # 영양 DB (필요컬럼만 남긴 CSV)
filtered_by_rep_path = "filtered_by_대표식품명.csv"  # 대표식품명과 바로 매칭된 행들
auto_map_path = "자동매핑.csv"                      # 자동 매핑 결과 (food_class, 대표식품명)
manual_done_path = "수동매핑_완료.csv"              # 수동 매핑 완료 파일


# ---------------------------
# 1. 전체 클래스 로드
# ---------------------------
with open(classes_path, encoding="utf-8") as f:
    classes = [line.strip() for line in f if line.strip()]
classes_set = set(classes)
print(f"[INFO] 전체 클래스 개수: {len(classes_set)}")


# ---------------------------
# 2. 영양 DB 로드
# ---------------------------
db = pd.read_csv(db_path, encoding="utf-8-sig")

if "대표식품명" not in db.columns:
    raise ValueError("'대표식품명' 컬럼이 없습니다. selected_columns_음식DB.csv를 확인하세요.")

rep_set = set(db["대표식품명"].astype(str))


# ---------------------------
# 3. filtered_by_대표식품명.csv → 처음부터 바로 매칭된 애들
#    (대표식품명이 classes.txt 안에 있는 경우)
# ---------------------------
filtered_by_rep = pd.read_csv(filtered_by_rep_path, encoding="utf-8-sig")

if "대표식품명" not in filtered_by_rep.columns:
    raise ValueError("'filtered_by_대표식품명.csv'에 '대표식품명' 컬럼이 없습니다.")

# unique 대표식품명 중에서 classes.txt 안에 있는 것만 사용
direct_rep_names = sorted(set(filtered_by_rep["대표식품명"].astype(str)) & classes_set)

filtered_by_rep_map = pd.DataFrame({
    "food_class": direct_rep_names,
    "대표식품명": direct_rep_names,
})

print(f"[INFO] filtered_by_대표식품명 기반 직접 매칭 개수: {len(filtered_by_rep_map)}")


# ---------------------------
# 4. 자동 매핑 불러오기 (자동매핑.csv)
#    이미 컬럼이 food_class, 대표식품명 이므로 그대로 사용
# ---------------------------
auto_map = pd.read_csv(auto_map_path, encoding="utf-8-sig")

if not {"food_class", "대표식품명"}.issubset(auto_map.columns):
    raise ValueError("자동매핑.csv에 'food_class', '대표식품명' 컬럼이 필요합니다.")

print(f"[INFO] 자동 매핑 개수: {len(auto_map)}")


# ---------------------------
# 5. 수동 매핑 불러오기 (수동매핑_완료.csv)
# ---------------------------
manual_done = pd.read_csv(manual_done_path, encoding="utf-8-sig")

# final_대표식품명 컬럼 이름 자동 탐색
final_col = None
for c in manual_done.columns:
    if "final" in c or "최종" in c:
        final_col = c
        break

if final_col is None:
    raise ValueError("수동매핑_완료.csv에서 'final_대표식품명' 같은 컬럼을 찾지 못했습니다.")

# final_대표식품명 이 비어있지 않은 것만 사용
manual_filled = manual_done[manual_done[final_col].astype(str).str.strip() != ""]

if "food_class" not in manual_filled.columns:
    raise ValueError("수동매핑_완료.csv에 'food_class' 컬럼이 없습니다.")

manual_map = manual_filled[["food_class", final_col]].rename(columns={final_col: "대표식품명"})

print(f"[INFO] 수동 매핑 개수: {len(manual_map)}")


# ---------------------------
# 6. direct match (클래스명 == 대표식품명) 중
#    아직 어디에도 매핑되지 않은 나머지 클래스들 처리
# ---------------------------
already_mapped_classes = (
    set(filtered_by_rep_map["food_class"].astype(str))
    | set(auto_map["food_class"].astype(str))
    | set(manual_map["food_class"].astype(str))
)

remaining_classes = classes_set - already_mapped_classes

direct_rows = []
for cls in remaining_classes:
    # classes.txt에 있고, 영양 DB의 대표식품명에도 그대로 있는 경우
    if cls in rep_set:
        direct_rows.append({"food_class": cls, "대표식품명": cls})

direct_map = pd.DataFrame(direct_rows)
print(f"[INFO] 추가 직접 일치 매핑 개수 (클래스명 == 대표식품명): {len(direct_map)}")


# ---------------------------
# 7. 최종 매핑 테이블 합치기
#    우선순위: 수동 > 자동 > filtered_by_rep > direct_map
# ---------------------------
final_map = pd.concat(
    [manual_map, auto_map, filtered_by_rep_map, direct_map],
    ignore_index=True
)

# 같은 food_class가 여러 군데 있을 수 있으니, 첫 번째만 사용
final_map = final_map.drop_duplicates(subset=["food_class"], keep="first")

# final_map에서 유효하지 않은 값 제거
final_map = final_map[final_map["food_class"].astype(str).str.strip() != ""]  # 빈값 제거
final_map = final_map[final_map["food_class"].astype(str).isin(classes_set)]   # classes.txt에 없는 건 제거
final_map = final_map.drop_duplicates(subset=["food_class"], keep="first")

print(f"[INFO] 최종 매핑 행 개수: {len(final_map)}")

# 150개 중 몇 개가 매핑됐는지 확인
mapped_classes = set(final_map["food_class"].astype(str))
missing_classes = classes_set - mapped_classes

print(f"[INFO] 매핑된 클래스 개수: {len(mapped_classes)}")
print(f"[INFO] 매핑 안 된 클래스 개수: {len(missing_classes)}")

if missing_classes:
    missing_df = pd.DataFrame(sorted(missing_classes), columns=["unmapped_food_class"])
    missing_df.to_csv("매핑실패_클래스목록.csv", index=False, encoding="utf-8-sig")
    print("⚠ 매핑실패_클래스목록.csv 저장 완료 (추가 확인 필요)")

# 매핑 결과 저장
final_map.to_csv("클래스_대표식품명_최종매핑.csv", index=False, encoding="utf-8-sig")
print("✅ 클래스_대표식품명_최종매핑.csv 저장 완료")


# ---------------------------
# 8. 영양 DB와 merge → 최종 영양 데이터셋
# ---------------------------
final_nutrition = final_map.merge(db, on="대표식품명", how="left")

print(f"[INFO] 최종 영양 DB 행 개수: {len(final_nutrition)}")

# 영양정보가 없는 클래스들 (에너지 NaN 기준)
if "에너지(kcal)" in final_nutrition.columns:
    no_nutrition = final_nutrition[final_nutrition["에너지(kcal)"].isna()]
    print(f"[INFO] 영양정보 없는 클래스 개수: {len(no_nutrition)}")

    if len(no_nutrition) > 0:
        no_nutrition[["food_class", "대표식품명"]].to_csv(
            "영양정보_없는_클래스목록.csv", index=False, encoding="utf-8-sig"
        )
        print("⚠ 영양정보_없는_클래스목록.csv 저장 완료")
else:
    print("⚠ '에너지(kcal)' 컬럼이 없어 영양정보 유무를 체크하지 못했습니다.")

# 최종 영양 DB 저장
final_nutrition.to_csv("클래스별_최종_영양DB.csv", index=False, encoding="utf-8-sig")
print("✅ 클래스별_최종_영양DB.csv 저장 완료")
