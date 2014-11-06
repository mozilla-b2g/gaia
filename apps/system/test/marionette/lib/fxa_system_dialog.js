'use strict';

function FxASystemDialog(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = FxASystemDialog;

FxASystemDialog.prototype = {
  client: null,

  show: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.FxAccountsUI.login();
    });
  },

  hide: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.FxAccountsUI.close();
    });
  }
};
