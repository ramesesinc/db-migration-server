import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "./App.css";

import HomeScreen from "./screen/HomeScreen"
import ModuleScreen from "./screen/ModuleScreen"
import ModuleEditScreen from "./screen/ModuleEditScreen"

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
          <Route path="/modules/:moduleId/edit">
            <ModuleEditScreen />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
