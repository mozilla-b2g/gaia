'use strict';

/**
 * A Marionette test helper for modal dialog flow.
 */

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function ModalDialog(client) {
  this.client = client.scope({ searchTimeout: 10000 }); //200000
  this.client.helper = client.helper;
}

module.exports = ModalDialog;

ModalDialog.Selector = Object.freeze({
  alert: {
    dialog: '.appWindow.active .smart-modal-dialog-container' +
            ' .modal-dialog-opened',
    ok: '.appWindow.active .modal-dialog-opened' +
        ' .modal-dialog-button-group smart-button:nth-child(1)',
    message: '.appWindow.active .modal-dialog-opened .modal-dialog-message'
  },
  prompt: {
    dialog: '.appWindow.active .smart-modal-dialog-container' +
            ' .modal-dialog-opened',
    ok: '.appWindow.active .modal-dialog-opened' +
        ' .modal-dialog-button-group smart-button:nth-child(2)',
    cancel: '.appWindow.active .modal-dialog-opened' +
            ' .modal-dialog-button-group smart-button:nth-child(1)',
    message: '.appWindow.active .modal-dialog-opened .modal-dialog-message',
    input: '.appWindow.active .modal-dialog-opened' +
           ' .modal-dialog-input-group input'
  },
  confirm: {
    dialog: '.appWindow.active .smart-modal-dialog-container' +
            ' .modal-dialog-opened',
    ok: '.appWindow.active .modal-dialog-opened' +
        ' .modal-dialog-button-group smart-button:nth-child(2)',
    cancel: '.appWindow.active' +
            ' .modal-dialog-button-group smart-button:nth-child(1)',
    message: '.appWindow.active .modal-dialog-opened .modal-dialog-message'
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

  get promptInput() {
    return this.client.findElement(ModalDialog.Selector.prompt.input);
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
      console.log('dialogClass =', dialogClass);
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
  },

  tryToWait: function (title, elem) {
    console.log('>>> Try to wait for', title);
    console.log('elem =', elem);
    var count = 10;
    this.client.waitFor(function() {
      var clazz = elem.getAttribute('class');
      console.log('class =', clazz);
      count--;
      if (count < 0 || clazz) return true;
    });
    console.log('<<< Try to wait for', title);
  },

  find: function (css, cb) {
    console.log('>>> Try to find ', css);
    return this.client.findElement(css, function (err, elem) {
      cb(css, err, elem);
    });
  }
};
