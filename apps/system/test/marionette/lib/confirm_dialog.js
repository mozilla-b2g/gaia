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
    var selector = 'gaia-confirm[data-type="' + type + '"]';
    return this.client.helper.waitForElement(selector);
  },

  /**
  Click confirm on a particular type of confirmation dialog.

  @param {String} type of dialog.
  @param {String} selector of the button. Defaults to .confirm.
  */
  confirm: function(type, button) {
    var dialog = this.getElement(type);
    var confirmButton;

    this.client.waitFor(function() {
      confirmButton = dialog.findElement(button || '.confirm');
      return confirmButton && confirmButton.displayed();
    });

    // XXX: Hack to use faster polling
    var quickly = this.client.scope({ searchTimeout: 50 });
    confirmButton.client = quickly;

    // tricky logic to ensure the dialog has been removed and clicked
    this.client.waitFor(function() {
      try {
        // click the dialog to dismiss it
        confirmButton.click();
        // ensure it is either hidden or hits the stale element ref
        return !confirmButton.displayed();
      } catch (e) {
        if (e.type === 'StaleElementReference') {
          // element was successfully removed
          return true;
        }
        throw e;
      }
    });
  }
};
