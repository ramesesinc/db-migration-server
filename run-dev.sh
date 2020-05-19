docker container stop db-migration-server

docker container rm db-migration-server

docker run -it -d \
    --name db-migration-server \
    -p 5000:5000 \
    ramesesinc/db-migration-server \
    node server.js
