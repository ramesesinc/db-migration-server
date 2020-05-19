import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles((theme) => ({
  root: {
    alignContent: "center",
    margin: "10px",
  },
  contentTitleContainer: {
    borderBottom: "1px solid",
    borderBottomColor: theme.palette.primary.main,
    marginBottom: "15px",
  },
  title: {
    fontSize: "1.25rem",
  },
}));

const Content = ({ title, children, ActionComponents }) => {
  const classes = useStyles();
  return (
    <>
      <CssBaseline />
      <Container className={classes.root}>
        <Container maxWidth="lg">
          <Grid container direction="row" alignItems="center" className={classes.contentTitleContainer}>
            <Typography className={classes.title}>{title}</Typography>
            {ActionComponents}
          </Grid>
          {children}
        </Container>
      </Container>
    </>
  );
};

export default Content;
