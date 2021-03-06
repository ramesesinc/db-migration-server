import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container"
import SettingsIcon from "@material-ui/icons/Settings";
import Toolbar from "@material-ui/core/Toolbar";

import Action from "../components/Action";
import Confirm from "../components/Confirm";
import Content from "../components/Content";
import Error from "../components/Error";
import Label from "../components/Label";
import Page from "../components/Page";

import ModuleFiles from "./components/ModuleFiles";

import * as api from "../api";
import { CircularProgress } from "@material-ui/core";

const ModuleScreen = (props) => {
  const initialModule = useLocation().state.module;
  const [module, setModule] = useState(initialModule);
  const [moduleFiles, setModuleFiles] = useState([]);
  const [deploying, setDeploying] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState();
  const [confirmDeploy, setConfirmDeploy] = useState(false);

  const loadFiles = useCallback(async () => {
    const moduleFiles = await api.getModuleFiles(module);
    setModuleFiles(moduleFiles);
  }, [module]);

  useEffect(() => {
    try {
      loadFiles();
    } catch (err) {
      console.log(err);
    }
  }, []);

  let history = useHistory();
  const settingHandler = () => {
    history.push({
      pathname: `/modules/${module.name}/setting`,
      state: { module },
    });
  };

  const deployFiles = async () => {
    try {
      await api.buildModule(module);
      await loadFiles();
    } catch (err) {
      setError(err);
    }
  };

  const deployFilesHandler = () => {
    setConfirmDeploy(false);
    setError(null);
    setDeploying(true);
    deployFiles().then(() => {
      setDeploying(false);
    });
  };
  
  const confirmDeployHandler = () => {
    setConfirmDeploy(true);
  };

  const closeConfirmHandler = () => {
    setConfirmDeploy(false);
  }

  console.log("RELOADING", reloading);

  const ModuleActions = (
    <Toolbar variant="dense">
      <Action
        title="Settings"
        color="primary"
        onClick={settingHandler}
        startIcon={<SettingsIcon />}
      />
    </Toolbar>
  );

  let hasUnprocessedFile = false;
  moduleFiles.forEach((moduleFile) => {
    moduleFile.files.forEach((file) => {
      if (file.state === 0) {
        hasUnprocessedFile = true;
      }
    });
  });

  let fileActions;
  if (hasUnprocessedFile) {
    fileActions = (
      <Toolbar>
        <Button
          variant="contained"
          color="secondary"
          onClick={confirmDeployHandler}
          disabled={deploying}
        >
          Deploy Files
        </Button>
        {deploying && <CircularProgress color="secondary" size={20} />}
        <Error text={error} />
      </Toolbar>
    );
  }

  const conf = JSON.stringify(module.conf);

  return (
    <Page>
      <Content
        title={`Module: ${module.name}`}
        ActionComponents={ModuleActions}
      >
        <Confirm 
          open={confirmDeploy} 
          title="Database Migration"
          message="Deploy migration files?"
          onCancel={closeConfirmHandler}
          onOk={deployFilesHandler}
        />
        <Container>
          <Label caption="Name:" width="300px" value={module.name} />
          <Label caption="Database:" value={module.dbname} />
          {/* <Label caption="Conf (json):" value={conf} /> */}
        </Container>
        {fileActions}
        <ModuleFiles files={moduleFiles} />
      </Content>
    </Page>
  );
};

export default ModuleScreen;
