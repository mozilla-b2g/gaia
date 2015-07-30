/*
 * TurnBluetoothOnDialog is responsible for:
 *   A confirmation dialog to ask user to turn Bluetooth on or not.
 *   There is a confirmation handling via here.
 */
define(function() {
  'use strict';

  var TurnBluetoothOnDialog = {
    init: function() {
      this.dialog = document.getElementById('enable-bluetooth-view');
      this.cancelBtn =
        document.getElementById('enable-bluetooth-button-cancel');
      this.confirmBtn =
        document.getElementById('enable-bluetooth-button-turn-on');
    },

    showConfirm: function() {
      return new Promise((resolve) => {
        this.cancelBtn.onclick = (evt) => {
          if (evt) {
            evt.preventDefault();
          }
          this.close();
          resolve('cancel');
        };

        this.confirmBtn.onclick = (evt) => {
          if (evt) {
            evt.preventDefault();
          }
          this.close();
          resolve('confirm');
        };

        this.dialog.hidden = false;
      });
    },

    get isVisible() {
      return (!this.dialog.hidden);
    },

    close: function() {
      this.dialog.hidden = true;
    }
  };

  TurnBluetoothOnDialog.init();
  return TurnBluetoothOnDialog;
});
