import React from "react";
import { withStyles, makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import Table from "@material-ui/core/Table";
import Typography from "@material-ui/core/Typography";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import DoneIcon from "@material-ui/icons/Done";
import ErrorIcon from "@material-ui/icons/Error";

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.common.black,
    width: props => props.width || null,
  },
  body: {
    fontSize: 14,
  },
}))(TableCell);

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
  moduleName: {
    fontSize: "1.25em",
    paddingTop: "10px"
  },
});

const ModuleTable = ({ file, showTitle }) => {
  const { name, files } = file;
  const classes = useStyles();

  return (
    <TableContainer component={Paper}>
      {showTitle && <Typography className={classes.moduleName}>{name}</Typography>}
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow>
            <StyledTableCell>File Name</StyledTableCell>
            <StyledTableCell width="250px">Date Filed</StyledTableCell>
            <StyledTableCell width="300px">Error</StyledTableCell>
            <StyledTableCell width="10px">State</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => {
            let StateIcon;
            let iconColor;
            if (file.errors) {
              StateIcon = ErrorIcon;
              iconColor = "red";
            } else if (file.state === 1) {
              StateIcon = DoneIcon;
              iconColor = "green";
            }
            return (
              <TableRow key={file.filename}>
                <TableCell component="th" scope="row">
                  {file.filename}
                </TableCell>
                <TableCell>{file.dtfiled}</TableCell>
                <TableCell>{file.errors}</TableCell>
                <TableCell>
                  {StateIcon && <StateIcon style={{ color: iconColor }} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ModuleFiles = ({ files }) => {
  return (
    <Container>
      {files.map((file) => (
        <ModuleTable key={file.name} file={file} showTitle={files.length > 1}/>
      ))}
    </Container>
  );
};

export default ModuleFiles;
