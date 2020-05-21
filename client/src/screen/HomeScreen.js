import React, { useState, useEffect } from "react";
import LinearProgress from "@material-ui/core/LinearProgress";
import Toolbar from "@material-ui/core/Toolbar";
import RefreshIcon from "@material-ui/icons/Refresh";

import Page from "../components/Page";
import Content from "../components/Content";
import Action from "../components/Action";
import Error from "../components/Error";

import ModuleItems from "./components/ModuleItems";
import * as api from "../api";

const HomeScreen = (props) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();

  const getModules = async () => {
    const modules = await api.getModules();
    setModules(modules);
  };

  const reloadModules = async () => {
    try {
      const modules = await api.reloadModules();
      setModules(modules);
    } catch (err) {
      setError(err);
    }
  };

  const reloadModulesHandler = () => {
    setError(null);
    setLoading(true);
    reloadModules().then(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    try {
      getModules();
    } catch (err) {
      console.log(err);
    }
  }, []);


  const Actions = (
    <Toolbar variant="dense">
      <Action
        title="Reload"
        color="primary"
        onClick={reloadModulesHandler}
        startIcon={<RefreshIcon />}
      />
    </Toolbar>
  );

  return (
    <Page>
      <Content title="Modules" ActionComponents={Actions}>
        <Error text={error} />
        {loading && <LinearProgress color="secondary" />}
        <Error text={!loading && !error && modules.length === 0 ? "No available modules." : null} />
        <ModuleItems modules={modules}/>
      </Content>
    </Page>
  );
};

export default HomeScreen;
