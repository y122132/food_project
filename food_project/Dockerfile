# Python 3.12 슬림 버전 사용 (용량 최적화)
FROM python:3.12-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 (PostgreSQL 연결 등을 위해 필요할 수 있음)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# Gunicorn으로 실행 (포트 8000)
# wsgi.py의 위치에 따라 'project_name.wsgi:application' 부분 수정 필요
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "food.wsgi:application"]