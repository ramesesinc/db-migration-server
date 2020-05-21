create table water_application (
    objid varchar(50) not null,
    state varchar(10) not null,
    primary key(objid)
)
;

create table water_bill (
    objid varchar(50) not null,
    state varchar(10) not null,
    primary key(objid)
)
;

create table water_bill_item (
    objid varchar(50) not null,
    state varchar(10) not null,
    primary key(objid)
)
;

create table water_reading (
    objid varchar(50) not null,
    state varchar(10) not null,
    primary key(objid)
)
;
