from django.core.management.base import BaseCommand
from food_app.models import Food
from food_app.vector_service import get_chroma_collection, get_embedding_model, create_document_from_food
import pprint

class Command(BaseCommand):
    help = 'Runs a step-by-step debug of the vector search process.'

    def handle(self, *args, **options):
        # --- 테스트 설정 ---
        TARGET_FOOD_NAME = "김치찌개"  # RDB와 Vector DB에서 확인할 특정 음식
        TEST_QUERY = "추운 날에 먹을만한 따뜻한 국물요리"

        self.stdout.write(self.style.SUCCESS("="*50))
        self.stdout.write(self.style.SUCCESS("  Vector Search 디버깅 스크립트 시작"))
        self.stdout.write(self.style.SUCCESS("="*50))

        # --- 1. RDB 데이터 확인 ---
        self.stdout.write(self.style.HTTP_INFO(f"\n[1/4] RDB에서 '{TARGET_FOOD_NAME}' 데이터 확인 중..."))
        try:
            food_object = Food.objects.get(representative_name=TARGET_FOOD_NAME)
            self.stdout.write(f"  - ID: {food_object.id}")
            self.stdout.write(f"  - 설명: {food_object.description[:100]}...") # 일부만 표시
            self.stdout.write(f"  - 상황 태그: {food_object.situational_tags}")
            self.stdout.write(self.style.SUCCESS("  [성공] RDB에 해당 음식이 존재하며, 설명 데이터가 포함되어 있습니다."))
            
            # VectorDB 문서와 비교하기 위해 RDB에서 문서를 생성
            rdb_document = create_document_from_food(food_object)

        except Food.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"  [실패] RDB에서 '{TARGET_FOOD_NAME}'을 찾을 수 없습니다."))
            self.stderr.write(self.style.ERROR("  'load_food_data' 명령어가 제대로 실행되었는지 확인해주세요."))
            return
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] RDB 조회 중 예기치 않은 오류 발생: {e}"))
            return

        # --- 2. Vector DB 상태 확인 ---
        self.stdout.write(self.style.HTTP_INFO("\n[2/4] Vector DB(ChromaDB) 상태 확인 중..."))
        try:
            collection = get_chroma_collection()
            collection_count = collection.count()
            self.stdout.write(f"  - Vector DB에 인덱싱된 총 아이템 수: {collection_count}")

            if collection_count == 0:
                self.stderr.write(self.style.ERROR("  [실패] Vector DB가 비어있습니다. 'index_food_vectors'를 실행해주세요."))
                return
            
            self.stdout.write(self.style.SUCCESS("  [성공] Vector DB가 비어있지 않습니다."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] Vector DB 컬렉션 로딩 중 오류 발생: {e}"))
            return

        # --- 3. Vector DB 데이터 확인 ---
        self.stdout.write(self.style.HTTP_INFO(f"\n[3/4] Vector DB에서 '{TARGET_FOOD_NAME}' (ID: {food_object.id}) 데이터 확인 중..."))
        try:
            vector_data = collection.get(ids=[str(food_object.id)])
            if not vector_data or not vector_data.get('documents'):
                self.stderr.write(self.style.ERROR(f"  [실패] Vector DB에 ID '{food_object.id}'에 해당하는 데이터가 없습니다."))
                self.stderr.write(self.style.ERROR("  'index_food_vectors' 명령어가 RDB의 최신 데이터를 반영하지 못한 것 같습니다."))
                return

            vector_document = vector_data['documents'][0]
            self.stdout.write("  - Vector DB에 저장된 문서 (일부):")
            self.stdout.write(f"    '{vector_document[:150]}...'")

            if rdb_document.strip() == vector_document.strip():
                 self.stdout.write(self.style.SUCCESS("  [성공] RDB 데이터와 Vector DB 문서 내용이 일치합니다."))
            else:
                 self.stdout.write(self.style.WARNING("  [주의] RDB 데이터와 Vector DB 문서 내용이 다릅니다. 'index_food_vectors'를 다시 실행해야 할 수 있습니다."))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] Vector DB에서 데이터 조회 중 오류 발생: {e}"))
            return

        # --- 4. 실시간 쿼리 테스트 ---
        self.stdout.write(self.style.HTTP_INFO(f"\n[4/4] 실시간 쿼리 테스트 실행 중..."))
        self.stdout.write(f"  - 테스트 쿼리: '{TEST_QUERY}'")
        try:
            model = get_embedding_model()
            query_embedding = model.encode(TEST_QUERY).tolist()

            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=5,
                include=["documents", "distances", "metadatas"]
            )
            
            self.stdout.write(self.style.SUCCESS("  [성공] 쿼리 실행 완료. 결과:"))
            self.stdout.write("-"*20)
            pprint.pprint(results)
            self.stdout.write("-"*20)

            if not results.get('ids') or not results['ids'][0]:
                self.stdout.write(self.style.WARNING("  [분석] 유사한 음식을 찾지 못했습니다. 쿼리와 데이터 간의 의미적 거리가 먼 것으로 보입니다."))
            else:
                self.stdout.write(self.style.SUCCESS("  [분석] 유사한 음식을 찾았습니다. 검색 로직은 정상적으로 작동하고 있습니다."))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] 쿼리 테스트 중 오류 발생: {e}"))
            return
            
        self.stdout.write(self.style.SUCCESS("\n" + "="*50))
        self.stdout.write(self.style.SUCCESS("  디버깅 스크립트 종료"))
        self.stdout.write(self.style.SUCCESS("="*50))
