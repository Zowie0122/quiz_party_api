include .env
export $(shell sed 's/=.*//' .env)

# Start the container, keep stdout attached
start:
	docker-compose up --abort-on-container-exit

# Rebuild containers without cache
cc:
	docker-compose build --no-cache

# Rebuild and run the container, keep stdout attached
restart:
	docker-compose up --force-recreate --build --abort-on-container-exit

# Start the container, detach stdout
up: # create-network
	docker-compose up -d

# Stop and remove containers
down:
	docker-compose down

# Rebuild and run the container, detach stdout
rebuild: # create-network
	docker-compose up -d --force-recreate --build

# Interactive terminal inside of docker
ash-app:
	docker exec -it quiz_party_api /bin/ash
