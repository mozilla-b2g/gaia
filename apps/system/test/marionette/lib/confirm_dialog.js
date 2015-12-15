'use strict';

/**
 * A helper module to interact with the confirm dialog in system app.
 */

function ConfirmDialog(client) {
  this.client = client.scope({ searchTimeout: 20000 });
}

module.exports = ConfirmDialog;

ConfirmDialog.prototype = {
  /**
  Fetch a particular type of a gaia-confirm dialog.

  @param {String} type of dialog.
  */
  getElement: function(type) {
    var selector = this.getDialogSelector(type);
    return this.client.helper.waitForElement(selector);
  },

  getDialogSelector: function(type) {
    return 'gaia-confirm[data-type="' + type + '"]';
  },

  /**
  Click confirm on a particular type of confirmation dialog.

  @param {String} type of dialog.
  @param {String} selector of the button. Defaults to .confirm.
  */
  confirm: function(type, button) {
    var dialogSelector = this.getDialogSelector(type);
    var confirmSelector = dialogSelector + ' .confirm';
    var confirmButton = this.client.helper.waitForElement(confirmSelector);
    this.client.waitFor(function() {
      return confirmButton.displayed();
    });
    confirmButton.click();
  }
};
