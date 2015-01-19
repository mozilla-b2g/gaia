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
    this.client.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      win.document.getElementById('fxa-dialog').addEventListener('animationend',
        function wait() {
          win.document.getElementById('fxa-dialog')
                      .removeEventListener('animationend', wait);
          marionetteScriptFinished();
        });
      window.wrappedJSObject.Service.request('FxAccountsUI:login');
    });
  },

  getHeight: function() {
    this.client.switchToFrame();
    this.client.switchToFrame(this.client.findElement('#fxa-iframe'));
    return this.client.executeScript(function() {
      return window.wrappedJSObject.innerHeight;
    });
  },

  typeEmail: function(email) {
    this.client.switchToFrame();
    this.client.switchToFrame(this.client.findElement('#fxa-iframe'));
    this.client.findElement('#fxa-email-input').sendKeys(email);
    this.client.executeScript(function() {
      window.wrappedJSObject.document.getElementById('fxa-email-input').blur();
    });
    this.client.switchToFrame();
    this.client.helper.waitForElementToDisappear(
      this.client.findElement('#keyboards .inputWindow.top-most'));
  },

  goToCOPPA: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.document.getElementById('fxa-iframe')
            .contentWindow.location.hash = 'fxa-coppa';
    });
  },

  focus: function() {
    this.client.switchToFrame();
    this.client.switchToFrame(this.client.findElement('#fxa-iframe'));
    this.client.findElement('#fxa-email-input').click();
  },

  focusAge: function() {
    this.client.switchToFrame();
    this.client.switchToFrame(this.client.findElement('#fxa-iframe'));
    this.client.helper.waitForElement('#fxa-age-select').click();
  },

  hide: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.FxAccountsUI.close();
    });
  }
};
