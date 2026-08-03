import React, { Component } from 'react';
import IconButton from '@material-ui/core/IconButton';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import { Scannable } from 'react-scannable';

export class TemporaryBoardButton extends Component {
  render() {
    const { increaseOutputButtons, ...other } = this.props;

    return (
      <Scannable>
        <IconButton
          aria-label="Abrir tablero temporal"
          className={
            increaseOutputButtons ? 'Output__button__lg' : 'Output__button__sm'
          }
          {...other}
        >
          <ViewModuleIcon
            className={
              increaseOutputButtons ? 'Output__icon__lg' : 'Output__icon__sm'
            }
          />
        </IconButton>
      </Scannable>
    );
  }
}

export default TemporaryBoardButton;
