import React from "react";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  labelCaption: {
    fontSize: "medium",
    width: props => props.width || "110px",
  },
  labelValue: {
    fontSize: "medium",
    borderBottom: "1px solid",
    borderBottomColor: theme.palette.primary.light,
    minWidth: "300px"
  }
}));

const Label = ({ caption, value, children }) => {
  const classes = useStyles();

  return (
    <Container className={classes.root}>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Typography variant="caption" className={classes.labelCaption}>{caption}</Typography>
        {value ? (
          <Typography className={classes.labelValue}>{value}</Typography>
        ) : (
          <Typography className={classes.labelValue}>{children}</Typography>
        )}
      </Grid>
    </Container>
  );
};

export default Label;
