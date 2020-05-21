cd client && npm install && cd ..

npm run build-client

docker rmi ramesesinc/db-migration-server:0.0.1 -f

docker system prune -f

docker build --build-arg DOCKER_ENV=production -t ramesesinc/db-migration-server:0.0.1 --rm .

