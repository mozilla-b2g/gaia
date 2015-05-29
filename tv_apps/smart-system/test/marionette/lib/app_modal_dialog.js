'use strict';

/**
 * A Marionette test helper for modal dialog flow.
 */

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function ModalDialog(client) {
  this.client = client.scope({ searchTimeout: 200000 });
  this.client.helper = client.helper;
}

module.exports = ModalDialog;

ModalDialog.Selector = Object.freeze({
  alert: {
    dialog: '.appWindow.active .smart-modal-dialog-container .modal-dialog',
    ok: '.appWindow.active .modal-dialog-button-group' +
        ' smart-button:nth-child(1)',
    message: '.appWindow.active .modal-dialog-message'
  },
  prompt: {
    dialog: '.appWindow.active .modal-dialog-prompt',
    ok: '.appWindow.active .modal-dialog-prompt-ok',
    cancel: '.appWindow.active .modal-dialog-prompt-cancel',
    title: '.appWindow.active .modal-dialog-prompt-title',
    message: '.appWindow.active .modal-dialog-prompt-message',
  },
  confirm: {
    dialog: '.appWindow.active .smart-modal-dialog-container .modal-dialog',
    ok: '.appWindow.active .modal-dialog-button-group' +
        ' smart-button:nth-child(1)',
    cancel: '.appWindow.active .modal-dialog-button-group' +
            ' smart-button:nth-child(2)',
    message: '.appWindow.active .modal-dialog-message',
  }
});

ModalDialog.prototype = {

  get alertDialog() {
    return this.client.findElement(ModalDialog.Selector.alert.dialog);
  },

  get alertOk() {
    return this.client.findElement(ModalDialog.Selector.alert.ok);
  },

  get alertMessage() {
    return this.client.findElement(ModalDialog.Selector.alert.message);
  },

  get promptDialog() {
    return this.client.findElement(ModalDialog.Selector.prompt.dialog);
  },

  get promptOk() {
    return this.client.findElement(ModalDialog.Selector.prompt.ok);
  },

  get promptCancel() {
    return this.client.findElement(ModalDialog.Selector.prompt.cancel);
  },

  get promptTitle() {
    return this.client.findElement(ModalDialog.Selector.prompt.title);
  },

  get promptMessage() {
    return this.client.findElement(ModalDialog.Selector.prompt.message);
  },

  get confirmDialog() {
    return this.client.findElement(ModalDialog.Selector.confirm.dialog);
  },

  get confirmOk() {
    return this.client.findElement(ModalDialog.Selector.confirm.ok);
  },

  get confirmCancel() {
    return this.client.findElement(ModalDialog.Selector.confirm.cancel);
  },

  get confirmMessage() {
    return this.client.findElement(ModalDialog.Selector.confirm.message);
  },

  /**
   * Wait for the specified element to show and send key to it
   * @param {Marionette.Element} element The element to wait for.
   * @param {String} key The desired key to send to element.
   */
  sendKeyToElement: function(element, key) {
    this.client.waitFor(function() {
      return element.displayed();
    }, function() {
      element.sendKeys(key);
    });
  },

  /**
   * Wait for the specified dialog to open.
   * @param {Marionette.Element} element The dialog element to wait for.
   */
  waitForDialogOpened: function(element) {
    this.client.waitFor(function() {
      var dialogClass = element.getAttribute('class');
      return dialogClass.indexOf('visible') != -1;
    });
  },

  /**
   * Wait for the specified dialog to close.
   * @param {Marionette.Element} element The dialog element to wait for.
   */
  waitForDialogClosed: function(element) {
    this.client.waitFor(function() {
      var dialogClass = element.getAttribute('class');
      return dialogClass.indexOf('visible') == -1;
    });
  }
};
