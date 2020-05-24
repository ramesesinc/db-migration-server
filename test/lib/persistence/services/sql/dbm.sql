[insertModule]
insert into dbm_module (
  name, dbname, conf, lastfileid
)
values(
  $P{name}, 
  $P{dbname},
  $P{conf},
  $P{lastfileid}
)


