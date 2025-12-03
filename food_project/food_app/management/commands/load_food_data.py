import pandas as pd
from django.core.management.base import BaseCommand
from food_app.models import Food
import json

class Command(BaseCommand):
    help = 'Loads food data from CSV files into the Food model'

    def handle(self, *args, **options):
        self.stdout.write("데이터 로딩 프로세스를 시작합니다...")

        # --- 데이터 파일 경로 ---
        nutrition_db_path = 'food_project/data/클래스별_최종_영양DB.csv'
        enriched_db_path = 'food_project/data/enriched_food_data_ko.csv'

        # --- CSV 파일 읽기 ---
        try:
            self.stdout.write(f"'{nutrition_db_path}'에서 영양 정보를 로딩합니다.")
            df_nutrition = pd.read_csv(nutrition_db_path)
            
            self.stdout.write(f"'{enriched_db_path}'에서 음식 설명 데이터를 로딩합니다.")
            df_enriched = pd.read_csv(enriched_db_path)
        except FileNotFoundError as e:
            self.stderr.write(self.style.ERROR(f"오류: 파일을 찾을 수 없습니다. {e}"))
            return

        # --- 데이터 병합 ---
        # '대표식품명'을 기준으로 두 데이터프레임을 합칩니다.
        self.stdout.write("영양 정보와 음식 설명 데이터를 병합합니다.")
        df_merged = pd.merge(df_nutrition, df_enriched, on='대표식품명', how='left')

        # --- 데이터베이스에 저장 ---
        created_count = 0
        updated_count = 0

        total_rows = len(df_merged)
        self.stdout.write(f"총 {total_rows}개의 음식 데이터를 데이터베이스에 저장/업데이트합니다.")

        for _, row in df_merged.iterrows():
            # '대표식품명'이 없는 경우 건너뛰기
            if pd.isna(row['대표식품명']):
                continue
            
            # JSON 필드에 들어갈 데이터 파싱 (문자열 -> 리스트)
            # 만약 데이터가 비어있거나(NaN) 잘못된 형식일 경우를 대비
            try:
                main_ingredients = json.loads(row['주요_재료'].replace("'", '"')) if pd.notna(row['주요_재료']) else []
            except (json.JSONDecodeError, TypeError):
                main_ingredients = []

            try:
                taste_profile = json.loads(row['맛_특징'].replace("'", '"')) if pd.notna(row['맛_특징']) else []
            except (json.JSONDecodeError, TypeError):
                taste_profile = []
            
            try:
                situational_tags = json.loads(row['상황_태그'].replace("'", '"')) if pd.notna(row['상황_태그']) else []
            except (json.JSONDecodeError, TypeError):
                situational_tags = []


            # update_or_create: '대표식품명'을 기준으로 데이터가 있으면 업데이트, 없으면 생성
            food_obj, created = Food.objects.update_or_create(
                representative_name=row['대표식품명'],
                defaults={
                    'food_class': row.get('food_class', ''),
                    'energy_kcal': row.get('에너지(kcal)'),
                    'protein_g': row.get('단백질(g)'),
                    'fat_g': row.get('지방(g)'),
                    'carbohydrate_g': row.get('탄수화물(g)'),
                    'sugars_g': row.get('당류(g)'),
                    'description': row.get('설명', ''),
                    'main_ingredients': main_ingredients,
                    'taste_profile': taste_profile,
                    'cooking_method': row.get('조리_방식', ''),
                    'situational_tags': situational_tags,
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            # 진행 상황 표시
            if (created_count + updated_count) % 100 == 0:
                self.stdout.write(f"  {created_count + updated_count} / {total_rows} 처리 완료...")

        self.stdout.write(self.style.SUCCESS(
            f"데이터 로딩 완료! 총 {total_rows}개 처리."
        ))
        self.stdout.write(self.style.SUCCESS(
            f"새로 생성된 음식: {created_count}개, 업데이트된 음식: {updated_count}개"
        ))
