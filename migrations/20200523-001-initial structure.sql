CREATE TABLE `dbm_module` (
  `name` varchar(100) NOT NULL,
  `dbname` varchar(100) NOT NULL,
  `conf` text,
  `lastfileid` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
;


CREATE TABLE `dbm_migration` (
  `parentid` varchar(100) NOT NULL,
  `filename` varchar(100) NOT NULL,
  `state` int(255) NOT NULL,
  `dtfiled` datetime(6) NOT NULL,
  `modulename` varchar(100) DEFAULT NULL,
  `errors` text,
  `file` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`parentid`,`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
;
