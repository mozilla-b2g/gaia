/*
 * CannotTransferDialog is responsible for:
 *   Alert a user that the activity request is not able to transfer via
 *   Bluetooth with some reason. There is an alert handling via here.
 */
define(function() {
  'use strict';

  var CannotTransferDialog = {
    init: function() {
      this.dialog = document.getElementById('alert-view');
      this.confirmBtn =
        document.getElementById('alert-button-ok');
    },

    showConfirm: function() {
      return new Promise((resolve) => {
        this.confirmBtn.onclick = () => {
          this.close();
          resolve();
        };
        this.dialog.hidden = false;
      });
    },

    get isVisible() {
      return (!this.dialog.hidden);
    },

    close : function() {
      this.dialog.hidden = true;
    }
  };

  CannotTransferDialog.init();
  return CannotTransferDialog;
});
