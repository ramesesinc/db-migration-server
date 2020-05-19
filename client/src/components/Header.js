import React from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import HomeIcon from "@material-ui/icons/HomeRounded";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  homeButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  company: {
    background: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 14,
    padding: 5, 
    paddingLeft: 15,
  },
}));

const Header = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const homeHandler = () => {
    history.replace("/");
  };

  return (
    <div className={classes.root}>
      <Typography className={classes.company}>Rameses Systems Inc.</Typography>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            className={classes.homeButton}
            onClick={homeHandler}
            color="inherit"
          >
            <HomeIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Database Migration
          </Typography>
        </Toolbar>
      </AppBar>
    </div>
  );
};

export default Header;
