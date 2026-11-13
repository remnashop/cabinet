FROM --platform=$BUILDPLATFORM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30-alpine@sha256:47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951
# fills NGINX_LOCAL_RESOLVERS from /etc/resolv.conf for the template's resolver
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY --chmod=755 docker/10-require-env.sh /docker-entrypoint.d/10-require-env.sh
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
