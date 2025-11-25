import pandas as pd

final = pd.read_csv("클래스별_최종_영양DB.csv", encoding="utf-8-sig")

# 1) 에너지 NaN인 애들 (영양정보 없음으로 잡힌 21개)
no_nutrition = final[final["에너지(kcal)"].isna()]

print("영양정보 없는 총 개수:", len(no_nutrition))

# 2) 그 중에서 대표식품명이 UNKNOWN인 것만
no_nutrition_unknown = no_nutrition[no_nutrition["대표식품명"] == "UNKNOWN"]
print("대표식품명 == UNKNOWN 인 개수:", len(no_nutrition_unknown))

# 3) UNKNOWN이 아닌데도 영양이 없는 애들 확인
extra = no_nutrition[no_nutrition["대표식품명"] != "UNKNOWN"][["food_class", "대표식품명"]]
print("\nUNKNOWN이 아닌데 영양이 없는 클래스들:")
print(extra)
