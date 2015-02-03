/*
 * PairExpiredDialog is responsible for:
 *   Notify a user that the earlier pairing request which fired in
 *   notification center is expired. There is a prompt handling via here.
 */
define(function(require) {
  'use strict';
  
  var PairExpiredDialog = {
    init: function() {
      this.dialog = document.getElementById('pairing-request-timeout');
      this.confirmBtn =
        document.getElementById('incoming-pairing-timeout-confirm');
    },

    showConfirm: function(callback) {
      var self = this;
      this.confirmBtn.onclick = function() {
        self.close();
        if (callback) {
          callback();
        }
      };
      this.dialog.hidden = false;
    },

    get isVisible() {
      return (!this.dialog.hidden);
    },

    close: function() {
      this.dialog.hidden = true;
    }
  };

  PairExpiredDialog.init();
  return PairExpiredDialog;
});

