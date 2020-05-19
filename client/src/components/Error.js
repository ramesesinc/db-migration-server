import React from "react";
import Typography from "@material-ui/core/Typography";

const Error = ({ text }) => {
  if ( text ) {
    return <Typography style={{ color: "red" }}>{text}</Typography>;
  }
  return null;
};

export default Error;
