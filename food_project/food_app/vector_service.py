import chromadb
from sentence_transformers import SentenceTransformer
from typing import List
import os
from django.conf import settings # Import Django settings
from food_app.models import Food 

# --- Configuration ---
# 프로젝트 루트에 'chroma_db_data'라는 이름으로 절대 경로를 지정합니다.
CHROMA_PERSIST_DIRECTORY = os.path.join(settings.BASE_DIR, 'chroma_db_data')
# 사용할 임베딩 모델
EMBEDDING_MODEL_NAME = 'jhgan/ko-sroberta-multitask'
# ChromaDB에서 사용할 컬렉션(테이블과 유사)의 이름
COLLECTION_NAME = 'food_collection'

# --- Singleton Instances ---
# 모델과 클라이언트는 메모리에 한 번만 로드하여 재사용합니다.
_embedding_model = None
_chroma_client = None
_collection = None


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

def get_chroma_collection():
    """
    ChromaDB 클라이언트와 컬렉션을 초기화하고 반환합니다.
    (싱글턴 패턴으로 한 번만 초기화)
    """
    global _chroma_client, _collection
    if _collection is None:
        if not os.path.exists(CHROMA_PERSIST_DIRECTORY):
            os.makedirs(CHROMA_PERSIST_DIRECTORY)
        
        print(f"ChromaDB를 '{CHROMA_PERSIST_DIRECTORY}' 경로에서 로드/생성합니다.")
        # 데이터를 디스크에 저장하는 PersistentClient 사용
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)
        
        # 임베딩 함수 정의
        # model = get_embedding_model()
        # embedding_function = chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL_NAME)

        print(f"컬렉션 '{COLLECTION_NAME}'을 가져옵니다/생성합니다.")
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            # embedding_function=embedding_function # embedding_function을 지정하면 upsert 시 자동으로 텍스트를 벡터로 변환해줍니다.
        )
        print("ChromaDB 컬렉션 준비 완료.")
    return _collection


def query_similar_foods(query_text: str, n_results: int = 5) -> List[int]:
    """
    주어진 텍스트와 의미적으로 유사한 음식의 ID 목록을 반환합니다.

    :param query_text: 사용자 쿼리 (예: "얼큰하고 시원한 국물 요리")
    :param n_results: 반환할 결과의 수
    :return: 유사한 음식의 ID 리스트 (예: [101, 25, 432])
    """
    collection = get_chroma_collection()
    model = get_embedding_model()

    # 쿼리 텍스트를 벡터로 변환
    query_embedding = model.encode(query_text).tolist()

    # ChromaDB에 쿼리 실행
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )

    # 결과에서 음식 ID (문자열로 저장됨)를 추출하여 정수 리스트로 변환
    food_ids = [int(id) for id in results['ids'][0]]
    
    print(f"'{query_text}'와 유사한 음식 ID 검색 결과: {food_ids}")
    return food_ids

# 이 파일이 직접 실행될 때 테스트용으로 사용할 수 있습니다.
if __name__ == '__main__':
    # 이 테스트는 데이터가 인덱싱된 후에 정상적으로 동작합니다.
    print("Vector DB 서비스 테스트 시작...")
    
    # ChromaDB와 모델 초기화
    get_chroma_collection()
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
