# syntax=docker/dockerfile:1

# ---- dev stage: hot reload via air ----
FROM golang:1.25-alpine AS dev
WORKDIR /app
RUN apk add --no-cache git curl bash && \
    go install github.com/air-verse/air@latest
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
EXPOSE 8080
CMD ["air", "-c", ".air.toml"]

# ---- build stage ----
FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-s -w -X github.com/canopy/api/internal/config.Version=${VERSION}" \
    -o /out/api ./cmd/api

# ---- runtime stage: distroless-ish minimal ----
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 canopy
USER canopy
COPY --from=build /out/api /usr/local/bin/api
EXPOSE 8080
ENTRYPOINT ["api"]
