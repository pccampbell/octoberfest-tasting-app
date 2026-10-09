FROM node:22.22.0-alpine3.23 AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM alpine:3.23.3 AS pocketbase
ARG TARGETARCH
RUN apk add --no-cache ca-certificates unzip wget
RUN case "$TARGETARCH" in \
      amd64) checksum=1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4 ;; \
      arm64) checksum=570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3 ;; \
      *) echo "Supported architectures: amd64, arm64"; exit 1 ;; \
    esac && \
    wget -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v0.40.5/pocketbase_0.40.5_linux_${TARGETARCH}.zip" && \
    echo "$checksum  /tmp/pb.zip" | sha256sum -c - && \
    unzip /tmp/pb.zip pocketbase -d /app

FROM alpine:3.23.3
RUN apk add --no-cache ca-certificates && addgroup -g 10001 tasting && adduser -D -u 10001 -G tasting tasting
WORKDIR /app
COPY --from=pocketbase /app/pocketbase /app/pocketbase
COPY --from=frontend /build/dist /app/pb_public
COPY pb_migrations /app/pb_migrations
COPY pb_hooks /app/pb_hooks
RUN mkdir /app/pb_data && chown -R tasting:tasting /app
USER tasting
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/app/pb_data", "--publicDir=/app/pb_public", "--migrationsDir=/app/pb_migrations", "--hooksDir=/app/pb_hooks", "--automigrate=0"]
