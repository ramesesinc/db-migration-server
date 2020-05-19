import React from "react";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import Header from "./Header";

const theme = createMuiTheme();

const Page = (props) => {
  return (
    <div>
      <ThemeProvider theme={theme}>
        <Header />
        {props.children}
      </ThemeProvider>
    </div>
  );
};

export default Page;
