FROM node:25 AS builder
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile
COPY . .
# 构建 Expo Web 静态文件
RUN npx expo export:web

# 使用 nginx 作为静态文件服务器
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
# 清理默认 nginx 文件
RUN rm -rf ./*
# 拷贝构建产物到 nginx 目录
COPY --from=builder /app/dist ./
# 拷贝自定义 nginx 配置（可选）
# COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
