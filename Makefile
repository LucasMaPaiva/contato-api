.PHONY: up down logs

# Comandos para gerenciar a infraestrutura via Docker
# Nota: Referencia o docker-compose.yml localizado nesta pasta

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f backend
