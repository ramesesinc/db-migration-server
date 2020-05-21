const path = require("path");
const bodyParser = require("body-parser");
const express = require("express");

const config = require("./config/config.js");
const port = global.gConfig.node_port;

const app = express();
const http = require("http").createServer(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


/* setup client */
const clientBuildPath = path.join("client", "build");
app.use(express.static(path.join(__dirname, clientBuildPath)));
app.use(express.static("public"));


/* migration routes */
const dbmigrations = require("./routes/dbmigrations");
app.use("/dbmigrations", dbmigrations);

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, clientBuildPath, "index.html"));
});


/* initalize migration services */
const db = require("./api/rameses-db-migration");
db.initialize(path.join(__dirname, "services"));

http.listen(port, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`Server listening on port ${port}`);
  }
});
