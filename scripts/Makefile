.PHONY: setup-env

ROOT_DIR = $(CURDIR)/..

setup-env:
	cp -n $(ROOT_DIR)/apps/backend/envs/.env.example $(ROOT_DIR)/apps/backend/envs/.env.development || true
	@echo "✅ apps/backend/envs/.env.development created. Fill in DATABASE_URL and other variables."
