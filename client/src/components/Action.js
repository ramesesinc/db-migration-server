import React from "react";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  button: {
    margin: (props) => props.margin || theme.spacing(1),
  },
}));

const Action = (props) => {
  const classes = useStyles();

  return (
    <Button
      className={classes.button}
      variant="contained"
      size="small"
      {...props}
    >
      {props.title}
    </Button>
  );
};

export default Action;
