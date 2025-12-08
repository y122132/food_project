from django.core.management.base import BaseCommand
from tqdm import tqdm
from food_app.models import Food
from food_app.vector_service import get_qdrant_client, get_embedding_model, create_document_from_food, COLLECTION_NAME
from qdrant_client.models import PointStruct
import numpy as np

# 한번에 처리할 데이터 묶음(배치) 크기
# 너무 크면 메모리 부족 문제가 생길 수 있고, 너무 작으면 처리 시간이 오래 걸립니다.
BATCH_SIZE = 100

class Command(BaseCommand):
    help = 'Indexes food data from the database into Qdrant'

    def handle(self, *args, **options):
        self.stdout.write("Vector DB 인덱싱 프로세스를 시작합니다...")

        # 1. Qdrant와 임베딩 모델 로드
        try:
            client = get_qdrant_client()
            model = get_embedding_model()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Vector DB 서비스 초기화 중 오류 발생: {e}"))
            return

        # 2. 데이터베이스에서 모든 음식 데이터 가져오기
        foods = list(Food.objects.all())
        if not foods:
            self.stderr.write(self.style.ERROR("데이터베이스에 음식 데이터가 없습니다. 먼저 'load_food_data'를 실행해주세요."))
            return
        
        self.stdout.write(f"총 {len(foods)}개의 음식 데이터를 인덱싱합니다.")

        # 3. 데이터를 배치 단위로 나누어 처리
        for i in tqdm(range(0, len(foods), BATCH_SIZE), desc="음식 데이터 인덱싱 중"):
            batch_foods = foods[i:i + BATCH_SIZE]
            
            # 현재 배치의 음식들에 대한 텍스트 문서 생성
            documents = [create_document_from_food(food) for food in batch_foods]
            
            # 텍스트 문서를 벡터로 변환 (인코딩)
            embeddings = model.encode(documents, convert_to_numpy=True).tolist()
            
            points = []
            for j, food in enumerate(batch_foods):
                 points.append(PointStruct(
                     id=food.id, # Django 모델의 ID (정수형) 사용
                     vector=embeddings[j],
                     payload={
                         "name": food.representative_name,
                         "document": documents[j] # 필요 시 원본 문서 텍스트 저장
                     }
                 ))

            # 4. Qdrant에 데이터 저장 (upsert)
            # 'upsert'는 ID가 존재하면 업데이트, 존재하지 않으면 새로 삽입합니다.
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=points
            )

        self.stdout.write(self.style.SUCCESS(
            f"Vector DB 인덱싱 완료! 총 {len(foods)}개의 음식이 성공적으로 처리되었습니다."
        ))