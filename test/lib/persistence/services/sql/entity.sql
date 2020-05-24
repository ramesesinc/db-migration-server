[getList]
SELECT * FROM entity

[getFilteredList]
SELECT *
FROM entity
WHERE state = $P{state}
AND name LIKE $P{searchtext}

[updateState]
UPDATE entity SET
state = $P{state}

[approve]
UPDATE entity SET
state = $P{state}
WHERE state = $P{draft}
AND age > $P{age}

