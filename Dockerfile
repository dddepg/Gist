FROM oven/bun:1 AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN bun install

COPY frontend/ ./
RUN bun run build

FROM golang:1.25.5-alpine AS backend-builder

WORKDIR /app/backend

RUN apk add --no-cache git build-base sqlite-dev

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -o gist-server ./cmd/server

FROM alpine:latest

RUN apk add --no-cache ca-certificates sqlite

WORKDIR /app

COPY --from=backend-builder /app/backend/gist-server ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV GIST_ADDR=:8080
ENV GIST_DATA_DIR=/app/data
ENV GIST_DB_PATH=/app/data/gist.db
ENV GIST_STATIC_DIR=/app/frontend/dist

EXPOSE 8080

CMD ["./gist-server"]