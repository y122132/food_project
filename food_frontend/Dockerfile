# [Stage 1] 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@latest && \
	npm install
COPY . .
RUN npm run build

# [Stage 2] 실행 단계 (Nginx로 정적 파일 서빙)
FROM nginx:alpine
# 빌드된 결과물을 Nginx 기본 경로로 복사
COPY --from=builder /app/dist /usr/share/nginx/html
# React Router 사용 시 404 에러 방지를 위한 설정 파일 복사 (필요 시)
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
