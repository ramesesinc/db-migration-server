import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container"
import EditIcon from "@material-ui/icons/Edit";
import Toolbar from "@material-ui/core/Toolbar";

import Action from "../components/Action";
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
  const [error, setError] = useState();

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
  const editHandler = () => {
    history.push({
      pathname: `/modules/${module.name}/edit`,
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
    setError(null);
    setDeploying(true);
    deployFiles().then(() => {
      setDeploying(false);
    });
  };

  const ModuleActions = (
    <Toolbar variant="dense">
      <Action
        title="Edit"
        color="secondary"
        onClick={editHandler}
        startIcon={<EditIcon />}
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
          color="primary"
          onClick={deployFilesHandler}
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
        <Container>
          <Label caption="Name:" width="300px" value={module.name} />
          <Label caption="Database:" value={module.dbname} />
          <Label caption="Conf (json):" value={conf} />
        </Container>
        {/* <ModuleInfo module={module} /> */}
        {fileActions}
        <ModuleFiles
          files={moduleFiles}
          onDeploy={deployFilesHandler}
          deploying={deploying}
        />
      </Content>
    </Page>
  );
};

export default ModuleScreen;
