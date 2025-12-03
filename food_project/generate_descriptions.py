import os
import pandas as pd
import json
from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY가 .env 파일에 없습니다.")

INPUT_CSV_PATH = 'food_project/data/클래스별_최종_영양DB.csv'
OUTPUT_CSV_PATH = 'food_project/data/enriched_food_data_ko.csv'
FOOD_NAME_COLUMN = '대표식품명'
FOOD_NAME_COLUMN_KO = '대표식품명' # Keep consistent column naming

# --- OpenAI Client ---
client = OpenAI(api_key=API_KEY)

def generate_description(food_name):
    """
    Generates a rich description for a food item using OpenAI API in Korean,
    with Korean keys in the JSON output.
    """
    if not isinstance(food_name, str) or food_name.strip().upper() == 'UNKNOWN':
        return json.dumps({
            "설명": "인식할 수 없는 음식 항목입니다. 이미지 분류가 명확하지 않을 때 사용되는 값입니다.",
            "주요_재료": [],
            "맛_특징": [],
            "조리_방식": "",
            "상황_태그": ["재촬영 필요", "명확하지 않은 이미지"]
        }, ensure_ascii=False)

    prompt = f"""
    음식 '{food_name}'에 대한 상세 설명을 생성해주세요.
    응답은 반드시 JSON 형식이어야 하며, 다음 **한글 키**들을 포함해야 합니다:
    - "설명": 음식에 대한 전반적인 개요.
    - "주요_재료": 주요 재료 목록 (list of strings).
    - "맛_특징": 맛을 표현하는 형용사 목록 (list of strings, 예: "달콤한", "매운", "짭짤한", "깊은 맛").
    - "조리_방식": 주된 조리 방식 (string, 예: "구이", "찜", "볶음", "찌개").
    - "상황_태그": 이 음식이 어울리는 상황, 기분, 환경에 대한 태그 목록 (list of strings, 예: "비오는 날", "기념일", "빠른 식사", "해장", "스트레스 해소", "맥주와 함께").

    '김치찌개'에 대한 예시:
    {{
        "설명": "묵은지와 돼지고기나 참치를 넣고 끓인 한국의 대표적인 찌개. 깊고 칼칼하며 짭짤한 맛이 특징으로, 한국 가정에서 가장 사랑받는 컴포트 푸드 중 하나입니다.",
        "주요_재료": ["김치", "돼지고기 또는 참치", "두부", "파"],
        "맛_특징": ["매운", "신맛", "짭짤한", "깊은 맛"],
        "조리_방식": "찌개",
        "상황_태그": ["비오는 날", "추운 날씨", "컴포트 푸드", "해장", "친구들과의 저녁"]
    }}

    이제 '{food_name}'에 대한 JSON을 생성해주세요:
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "당신은 한국 음식에 대한 구조화된 데이터를, 요청된 한글 키를 사용한 JSON 형식으로 제공하는 유용한 어시스턴트입니다."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"'{food_name}'에 대한 OpenAI API 호출 중 오류 발생: {e}")
        return None

def main():
    """
    Main function to read CSV, generate descriptions, and save the new CSV.
    """
    print(f"{INPUT_CSV_PATH} 에서 데이터를 읽는 중...")
    try:
        df = pd.read_csv(INPUT_CSV_PATH)
    except FileNotFoundError:
        print(f"오류: {INPUT_CSV_PATH} 에서 파일을 찾을 수 없습니다.")
        return

    unique_foods = df.drop_duplicates(subset=[FOOD_NAME_COLUMN]).copy()
    unique_foods[FOOD_NAME_COLUMN] = unique_foods[FOOD_NAME_COLUMN].fillna('')
    
    process_df = unique_foods
    print(f"{len(process_df)}개의 고유한 음식 설명을 생성합니다...")

    results = []
    for food_name in tqdm(process_df[FOOD_NAME_COLUMN], desc="설명 생성 중"):
        if not food_name: # Skip empty food names
            continue
            
        print(f"\n{food_name}에 대한 설명 생성 중...")
        generated_json_str = generate_description(food_name)

        if generated_json_str:
            try:
                generated_data = json.loads(generated_json_str)
                generated_data[FOOD_NAME_COLUMN_KO] = food_name
                results.append(generated_data)
                print(f"{food_name}에 대한 데이터 생성 성공")
            except json.JSONDecodeError as e:
                print(f"오류: {food_name}에 대한 JSON 응답을 디코딩할 수 없습니다: {e}")
                print("받은 응답:", generated_json_str)

    if not results:
        print("생성된 설명이 없습니다. 종료합니다.")
        return

    enriched_df = pd.DataFrame(results)

    if not enriched_df.empty:
        cols = [FOOD_NAME_COLUMN_KO] + [col for col in enriched_df.columns if col != FOOD_NAME_COLUMN_KO]
        enriched_df = enriched_df[cols]

    print(f"\n{OUTPUT_CSV_PATH}에 강화된 데이터를 저장 중...")
    enriched_df.to_csv(OUTPUT_CSV_PATH, index=False, encoding='utf-8-sig')

    print("--- 강화된 데이터 샘플 ---")
    print(enriched_df.head())
    print("\n프로세스가 성공적으로 완료되었습니다!")

if __name__ == "__main__":
    main()