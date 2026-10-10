FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-cabinet-config.sh /docker-entrypoint.d/40-cabinet-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
