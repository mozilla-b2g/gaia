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
    if(!this._alertDialog) {
      this._alertDialog =
        this.client.findElement(ModalDialog.Selector.alert.dialog);
    }
    return this._alertDialog;
  },

  get alertOk() {
    if(!this._alertOk) {
      this._alertOk =
        this.client.findElement(ModalDialog.Selector.alert.ok);
    }
    return this._alertOk;
  },

  get alertMessage() {
    if(!this._alertMessage) {
      this._alertMessage =
        this.client.findElement(ModalDialog.Selector.alert.message);
    }
    return this._alertMessage;
  },

  get promptDialog() {
    if(!this._promptDialog) {
      this._promptDialog =
        this.client.findElement(ModalDialog.Selector.prompt.dialog);
    }
    return this._promptDialog;
  },

  get promptOk() {
    if(!this._promptOk) {
      this._promptOk =
        this.client.findElement(ModalDialog.Selector.prompt.ok);
    }
    return this._promptOk;
  },

  get promptCancel() {
    if(!this._promptCancel) {
      this._promptCancel =
        this.client.findElement(ModalDialog.Selector.prompt.cancel);
    }
    return this._promptCancel;
  },

  get promptTitle() {
    if(!this._promptTitle) {
      this._promptTitle =
        this.client.findElement(ModalDialog.Selector.prompt.title);
    }
    return this._promptTitle;
  },

  get promptMessage() {
    if(!this._promptMessage) {
      this._promptMessage =
        this.client.findElement(ModalDialog.Selector.prompt.message);
    }
    return this._promptMessage;
  },

  get promptInput() {
    if(!this._promptInput) {
      this._promptInput =
        this.client.findElement(ModalDialog.Selector.prompt.input);
    }
    return this._promptInput;
  },

  get confirmDialog() {
    if(!this._confirmDialog) {
      this._confirmDialog =
        this.client.findElement(ModalDialog.Selector.confirm.dialog);
    }
    return this._confirmDialog;
  },

  get confirmOk() {
    if(!this._confirmOk) {
      this._confirmOk =
        this.client.findElement(ModalDialog.Selector.confirm.ok);
    }
    return this._confirmOk;
  },

  get confirmCancel() {
    if(!this._confirmCancel) {
      this._confirmCancel =
        this.client.findElement(ModalDialog.Selector.confirm.cancel);
    }
    return this._confirmCancel;
  },

  get confirmMessage() {
    if(!this._confirmMessage) {
      this._confirmMessage =
        this.client.findElement(ModalDialog.Selector.confirm.message);
    }
    return this._confirmMessage;
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
