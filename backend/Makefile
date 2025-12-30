.PHONY: build run dev clean test lint deps

BINARY_NAME=richlistbiz-api
BUILD_DIR=./bin
MAIN_PATH=./cmd/server

build:
	@echo "Building..."
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

run: build
	@echo "Running..."
	@$(BUILD_DIR)/$(BINARY_NAME)

dev:
	@echo "Starting development server..."
	@go run $(MAIN_PATH)/main.go

clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@go clean

test:
	@echo "Running tests..."
	@go test -v ./...

lint:
	@echo "Running linter..."
	@golangci-lint run

deps:
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

fmt:
	@echo "Formatting code..."
	@go fmt ./...

vet:
	@echo "Running go vet..."
	@go vet ./...

docker-build:
	@echo "Building Docker image..."
	@docker build -t $(BINARY_NAME):latest .

docker-run:
	@echo "Running Docker container..."
	@docker run -p 8080:8080 --env-file .env $(BINARY_NAME):latest

migrate-up:
	@echo "Running migrations..."
	@psql $(DATABASE_URL) -f ../production_referral_system.sql

help:
	@echo "Available commands:"
	@echo "  make build       - Build the binary"
	@echo "  make run         - Build and run the binary"
	@echo "  make dev         - Run in development mode (hot reload not included)"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make test        - Run tests"
	@echo "  make lint        - Run linter"
	@echo "  make deps        - Download dependencies"
	@echo "  make fmt         - Format code"
	@echo "  make vet         - Run go vet"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo "  make migrate-up   - Run database migrations"
