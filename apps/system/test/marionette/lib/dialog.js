'use strict';

function Dialog(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = Dialog;

Dialog.Selector = {
  visibleDialog: '.generic-dialog.visible',
  okButton: '.generic-dialog.visible .affirmative',
  messageContainer: '.generic-dialog.visible .inner',
  menu: '.generic-dialog.visible menu',
  title: '.generic-dialog.visible .inner h3'
};

Dialog.prototype = {
  client: null,
  system: null,
  alert: function(message) {
    this.client.executeScript(function(message) {
      return window.setTimeout(function() {
        window.wrappedJSObject.alert(message);
      });
    }, [message]);
  },
  confirm: function(message) {
    this.client.executeScript(function(message) {
      return window.setTimeout(function() {
        window.wrappedJSObject.confirm(message);
      });
    }, [message]);
  },
  prompt: function(message) {
    this.client.executeScript(function(message) {
      return window.setTimeout(function() {
        window.wrappedJSObject.prompt(message);
      });
    }, [message]);
  },

  get current() {
    return this.client.findElement(Dialog.Selector.visibleDialog);
  },

  get okButton() {
    return this.client.findElement(Dialog.Selector.okButton);
  },

  get menu() {
    return this.client.findElement(Dialog.Selector.menu);
  },

  get title() {
    return this.client.findElement(Dialog.Selector.title);
  },

  get messageContainer() {
    return this.client.findElement(Dialog.Selector.messageContainer);
  }
};
