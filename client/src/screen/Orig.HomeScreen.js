import React, { useState, useEffect } from "react";
import IconButton from "@material-ui/core/IconButton";
import LinearProgress from "@material-ui/core/LinearProgress";
import RefreshIcon from "@material-ui/icons/Refresh";

import Header from "../components/Header";
import Content from "../components/Content";
import ModuleItem from "../components/ModuleItem";
import Error from "../components/Error";

import * as api from "../api";

const HomeScreen = (props) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();

  const getModules = async () => {
    const modules = await api.getModules();
    setModules(modules);
  };

  const buildModules = async () => {
    try {
      const modules = await api.buildModules();
      setModules(modules);
    } catch (err) {
      setError(err);
    }
  }

  const buildModulesHandler = () => {
    setError(null);
    setLoading(true);
    buildModules().then(() => {
      setLoading(false);
    })
  };

  useEffect(() => {
    try {
      getModules();
    } catch (err) {
      console.log(err);
    }
  }, []);


  let components;
  if (error) {
    components = <Error text={error} />
  }
  else if (loading) {
    components = <LinearProgress color="secondary" />;
  } else if (modules.length > 0) {
    components = modules.map((mod) => <ModuleItem key={mod.name} module={mod} />);
  } else {
    components = (
      <div>
        <span>No available modules.</span>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <Content
        title="Modules"
        ActionComponent={
          !loading && (
            <IconButton
              color="primary"
              aria-label="Build Modules"
              onClick={buildModulesHandler}
            >
              <RefreshIcon />
            </IconButton>
          )
        }
      >
        {components}
      </Content>
    </div>
  );
};

export default HomeScreen;
