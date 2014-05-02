'use strict';

define(function(require, exports) {

  var cards = require('cards'),
      ConfirmDialog = require('element!cards/confirm_dialog');

  /**
   * A class method used by others to create confirm dialogs.
   * This method has two call types, to accommodate older
   * code that used ConfirmDialog to pass a full form node:
   *
   *  ConfirmDialog.show(dialogFormNode, confirmObject, cancelObject);
   *
   * and simpler code that just wants to pass a string message
   * and a callback that returns true (if OK is pressed) or
   * false (if cancel is pressed):
   *
   *  ConfirmDialog.show(messageString, function(confirmed) {});
   *
   * This newer style mimics a plain confirm dialog, with an
   * OK and Cancel that are not customizable.
   */
  ConfirmDialog.show = function(message, callback, cancel) {
    var dialogBodyNode;

    // Old style confirms that have their own form.
    if (typeof message !== 'string') {
      dialogBodyNode = message;
      message = null;
    }

    cards.pushCard('confirm_dialog', 'immediate', {
      dialogBodyNode: dialogBodyNode,
      message: message,
      confirm: callback,
      callback: callback,
      cancel: cancel
    }, 'right');
  };

  return ConfirmDialog;

});
