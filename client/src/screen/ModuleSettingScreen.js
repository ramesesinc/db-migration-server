import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import jsonFormat from "json-format";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import TextareaAutosize from "@material-ui/core/TextareaAutosize";
import Toolbar from "@material-ui/core/Toolbar";
import BackIcon from "@material-ui/icons/ArrowBack";

import Action from "../components/Action";
import Content from "../components/Content";
import Error from "../components/Error";
import Page from "../components/Page";

import * as api from "../api";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiTextField-root": {
      margin: theme.spacing(1),
      width: "30ch",
    },
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  button: {
    margin: theme.spacing(1),
  },
  formInfoContainer: {
    marginLeft: 15,
    marginRight: 15,
    display: "flex",
    flexDirection: "column",
  },
}));

const formatConf = (conf) => {
  if (!conf) return conf;
  return jsonFormat(conf, { type: "space", size: 2 });
};

const ModuleSettingScreen = (props) => {
  const initialModule = useLocation().state.module;
  const [module, setModule] = useState(initialModule);
  const [confStr, setConfStr] = useState(formatConf(initialModule.conf));
  const [confError, setConfError] = useState();

  const classes = useStyles();

  const backHandler = () => {
    history.replace({
      pathname: `/modules/${module.name}`,
      state: { module: initialModule },
    });
  };

  const history = useHistory();

  const submitHandler = async (event) => {
    event.preventDefault();
    await api.saveModule(module);
    history.replace({
      pathname: `/modules/${module.name}`,
      state: { module },
    });
  };

  const ModuleActions = (
    <Toolbar variant="dense">
      <Action title="Back" onClick={backHandler} startIcon={<BackIcon />} />
    </Toolbar>
  );


  return (
    <Page>
      <Content
        title={`Module: ${module.name}`}
        ActionComponents={ModuleActions}
      >
        <form
          className={classes.root}
          noValidate
          autoComplete="off"
          onSubmit={submitHandler}
        >
          <div className={classes.formInfoContainer}>
            <TextField
              id="name"
              label="Module Name"
              defaultValue={module.name}
              InputProps={{ readOnly: true }}
            />
            <TextField
              id="dbname"
              label="Database Name"
              required
              value={module.dbname}
              InputProps={{ readOnly: true }}
            />
            <Error text={confError} />
            <TextareaAutosize
              id="conf"
              aria-label="minimum height"
              label="Configuration"
              multiline
              rows={15}
              value={confStr}
            />
          </div>
        </form>
      </Content>
    </Page>
  );
};

export default ModuleSettingScreen;
