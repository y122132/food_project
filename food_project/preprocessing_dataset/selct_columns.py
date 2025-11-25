import pandas as pd

# Load original Excel
df = pd.read_excel("20250408_음식DB.xlsx")

# Columns to KEEP
keep_cols = [
    "식품명",
    "대표식품명",
    "식품중분류명",
    "영양성분함량기준",
    "에너지(kcal)",
    "수분(g)",
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
    "트랜스지방산(g)"
]

# Keep only columns that actually exist
keep_cols_existing = [c for c in keep_cols if c in df.columns]
filtered_df = df[keep_cols_existing]

# Save filtered version as CSV
output_csv = "filtered_음식DB_필요칼럼만.csv"
filtered_df.to_csv(output_csv, index=False, encoding="utf-8-sig")
