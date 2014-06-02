/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global PairExpiredDialog */

'use strict';

(function(exports) {
  /*
   * PairExpiredDialog is responsible for:
   *   Notify a user that the earlier pairing request which fired in
   *   notification center is expired. There is a prompt handling via here.
   */
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

  exports.PairExpiredDialog = PairExpiredDialog;

})(window);

navigator.mozL10n.once(PairExpiredDialog.init.bind(PairExpiredDialog));
