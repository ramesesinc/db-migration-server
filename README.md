# DB Migration Server

## Setup

### Migration Database

1. Create the migration database to store module and migration information. MySQL is currently supported. Support for MSSQL is ongoing.

1. Run the initial script under docker-sources/core/db-migration-server/migrations.

  ```
  - 20200523-001-initial structure.sql
  ```

3. Setup the required configuration for the migration database. It could be added as environment variables in docker-compose or defined in the centralize _custom/env.conf. The required keys are:

```
dbm_db_type=mysql
dbm_db_host=192.168.1.7
dbm_db_name=dbm
dbm_db_user=root
dbm_db_pass=1234
```

### Env Configuration

An env.conf file is required under every **module/migrations** folder. The values could either be hard-coded or dynamically set using any keys defined from _custom/env.conf. Below are the standard keys for database and service connection. At least one the the settings should be defined. 

```end
# standard database keys
db_type=mysql
db_host=${waterworks_db_ip}
db_port=3306
db_name=waterworks
db_user=root
db_pass=1234

# standard service keys
app_server=${app_server_ip}:8070
app_cluster=osiris3
app_context=etracs25
```


### Docker-Compose Setup

The standard compose file is shown below. The _custom/env.conf contains the specific  configurations for each lgu as currently defined in existing deployments.

```yaml
version: "3"
services:
  migration-server:
    image: ramesesinc/db-migration-server:0.0.1
    container_name: db-migration-server
    restart: always
    logging:
      driver: "json-file"
      options:
        max-file: "5"
        max-size: 10m
    ports:
      - "5000:5000"
    environment:
      TZ: "Asia/Manila"
    env_file:
      - ./_custom/env.conf
    volumes:
      - /home/rameses/dbm-root/waterworks/migrations:/dbm-root/waterworks/migrations
    
```

  
## Web Interface

* To access the Migration Server web interface, acces url **http://serveripaddress:5000**
* To view basic documentation, access url **http://serveripaddress:5000/dbmigrations/help**


