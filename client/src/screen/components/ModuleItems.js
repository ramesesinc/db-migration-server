import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ModuleIcon from "@material-ui/icons/ViewModule";

import ListItemLink from "../../components/ListItemLink";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    backgroundColor: theme.palette.background.paper,
  },
}));

const ModuleItems = ({ modules }) => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <List component="nav">
        {modules.map((module) => (
          <ListItemLink
            key={module.name}
            primary={module.name}
            icon={<ModuleIcon color="primary" fontSize="large" />}
            to={{ pathname: `/modules/${module.name}`, state: { module } }}
          />
        ))}
      </List>
    </div>
  );
};

export default ModuleItems;
