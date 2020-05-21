import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "./App.css";

import HomeScreen from "./screen/HomeScreen"
import ModuleScreen from "./screen/ModuleScreen"
import ModuleSettingScreen from "./screen/ModuleSettingScreen"

function App() {
  return (
    <Router>
      <div>
        <Switch>
          <Route exact path="/">
            <HomeScreen />
          </Route>
          <Route exact path="/modules/:moduleId">
            <ModuleScreen />
          </Route>
          <Route path="/modules/:moduleId/setting">
            <ModuleSettingScreen />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
