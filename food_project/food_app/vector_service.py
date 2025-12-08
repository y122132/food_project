from sentence_transformers import SentenceTransformer
import os
from django.conf import settings # Import Django settings
from food_app.models import Food
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from typing import List

# --- Configuration ---
# 프로젝트 루트에 'qdrant_db_data'라는 이름으로 절대 경로를 지정합니다.
QDRANT_PATH = os.path.join(settings.BASE_DIR, 'qdrant_db_data')
# 사용할 임베딩 모델
EMBEDDING_MODEL_NAME = 'jhgan/ko-sroberta-multitask'
# Qdrant에서 사용할 컬렉션 이름
COLLECTION_NAME = 'food_collection'
# 임베딩 벡터 차원 (jhgan/ko-sroberta-multitask 모델은 768차원)
VECTOR_DIMENSION = 768

# --- Singleton Instances ---
# 모델과 클라이언트는 메모리에 한 번만 로드하여 재사용합니다.
_embedding_model = None
_qdrant_client = None


def create_document_from_food(food: Food) -> str:
    """
    Food 객체로부터 Vector DB에 저장할 텍스트 문서를 생성합니다.
    의미 검색의 품질을 높이기 위해 관련된 텍스트 정보를 조합합니다.
    """
    # 맛 특징과 상황 태그는 리스트 형태이므로, 텍스트로 변환합니다.
    taste_profile_str = ", ".join(food.taste_profile)
    situational_tags_str = ", ".join(food.situational_tags)
    
    # 모든 텍스트 정보를 조합하여 하나의 문서로 만듭니다.
    document = (
        f"음식명: {food.representative_name}. "
        f"설명: {food.description}. "
        f"주요 재료: {', '.join(food.main_ingredients)}. "
        f"맛: {taste_profile_str}. "
        f"상황: {situational_tags_str}. "
        f"조리법: {food.cooking_method}."
    )
    return document


def get_embedding_model():
    """
    SentenceTransformer 임베딩 모델을 로드하고 반환합니다.
    (싱글턴 패턴으로 한 번만 로드)
    """
    global _embedding_model
    if _embedding_model is None:
        print(f"임베딩 모델 '{EMBEDDING_MODEL_NAME}'을 CPU로 로드합니다... (최초 실행 시 시간이 걸릴 수 있습니다)")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, device='cpu')
        print("임베딩 모델 로드 완료.")
    return _embedding_model

def get_qdrant_client():
    """
    Qdrant 클라이언트를 초기화하고 반환합니다.
    (싱글턴 패턴으로 한 번만 초기화)
    """
    global _qdrant_client
    if _qdrant_client is None:
        if not os.path.exists(QDRANT_PATH):
            os.makedirs(QDRANT_PATH)
        
        # 로컬 디스크 저장 모드 사용
        # 추후 서버 사용 시:
        #qdrant_url = os.getenv('QDRANT_URL')
        if qdrant_url:
            # 환경변수에 URL이 있으면 서버 모드 사용
            print(f"Qdrant 서버({qdrant_url})에 연결합니다.")
            _qdrant_client = QdrantClient(url=settings.qdrant_url) 
        else:
            #없으면 로컬 파일 모드 사용
            print(f"Qdrant를 '{QDRANT_PATH}' 경로에서 로드/생성합니다.")
            _qdrant_client = QdrantClient(path=QDRANT_PATH)
        
        if not _qdrant_client.collection_exists(COLLECTION_NAME):
             print(f"컬렉션 '{COLLECTION_NAME}'을 생성합니다. (차원: {VECTOR_DIMENSION})")
             _qdrant_client.create_collection(
                 collection_name=COLLECTION_NAME,
                 vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
             )
             print("Qdrant 컬렉션 준비 완료.")
        else:
             print(f"컬렉션 '{COLLECTION_NAME}'이 이미 존재합니다.")

    return _qdrant_client


def query_similar_foods(query_text: str, n_results: int = 5) -> List[int]:
    """
    주어진 텍스트와 의미적으로 유사한 음식의 ID 목록을 반환합니다.

    :param query_text: 사용자 쿼리 (예: "얼큰하고 시원한 국물 요리")
    :param n_results: 반환할 결과의 수
    :return: 유사한 음식의 ID 리스트 (예: [101, 25, 432])
    """
    client = get_qdrant_client()
    model = get_embedding_model()

    # 쿼리 텍스트를 벡터로 변환
    query_embedding = model.encode(query_text).tolist()

    # Qdrant에 쿼리 실행 (search 메서드 대신 query_points 사용)
    # 1.16.x 버전 등에서 search가 노출되지 않는 경우 대응
    search_result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=n_results
    ).points

    # 결과에서 음식 ID (payload에 저장됨)를 추출하여 정수 리스트로 변환
    # Qdrant Point의 id를 음식 ID로 사용했다면 point.id를 사용해도 됨
    food_ids = [point.id for point in search_result]
    
    print(f"'{query_text}'와 유사한 음식 ID 검색 결과: {food_ids}")
    return food_ids

# 이 파일이 직접 실행될 때 테스트용으로 사용할 수 있습니다.
if __name__ == '__main__':
    # 이 테스트는 데이터가 인덱싱된 후에 정상적으로 동작합니다.
    print("Vector DB 서비스 테스트 시작...")
    
    # Qdrant와 모델 초기화
    get_qdrant_client()
    get_embedding_model()

    # 테스트 쿼리
    test_query = "비오는 날 생각나는 따뜻한 국물 요리"
    try:
        similar_ids = query_similar_foods(test_query, n_results=3)
        if not similar_ids:
             print("결과 없음: 아직 데이터가 인덱싱되지 않았을 수 있습니다.")
        else:
            print(f"'{test_query}'에 대한 테스트 쿼리 결과 (음식 ID): {similar_ids}")

    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        print("오류 원인: 데이터가 아직 인덱싱되지 않았을 가능성이 높습니다.")

    print("Vector DB 서비스 테스트 종료.")
