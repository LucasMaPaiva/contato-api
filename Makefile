.PHONY: up down logs

ifneq (,$(wildcard .env))
include .env
endif

PROFILE ?= local
export PROFILE

ifeq ($(PROFILE),prod)
SERVICE_NAME := backend-proxy
else
SERVICE_NAME := backend
endif

DOCKER_COMPOSE := docker compose --profile $(PROFILE)

# Comandos para gerenciar a infraestrutura via Docker
# Nota: Referencia o docker-compose.yml localizado nesta pasta

up:
	$(DOCKER_COMPOSE) up --build -d

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f $(SERVICE_NAME)
