docker-compose down
docker system prune -f
sudo rm -rvf ~/temp/dbmigration-redis/
docker-compose up -d