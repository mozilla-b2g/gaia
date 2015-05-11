'use strict';

function System(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = System;

System.URL = 'app://smart-system.gaiamobile.org/manifest.webapp';

System.Selector = Object.freeze({
  appChromeContextMenu: '.appWindow.active .contextmenu'
});

System.prototype = {
  client: null,

  URL: System.URL,

  Selector: System.Selector,

  get appChromeContextMenu() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenu);
  },

  getAppIframe: function(url) {
    return this.client.findElement('iframe[src*="' + url + '"]');
  },

  getHomescreenIframe: function() {
    return this.client.findElement('#homescreen iframe');
  },

  waitForLaunch: function(url) {
    this.client.apps.launch(url);
    var iframe = this.getAppIframe(url);
    this.client.waitFor(function() {
      return iframe.displayed();
    });

    return iframe;
  },

  waitForEvent: function(evt) {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function(evt) {
      var win = window.wrappedJSObject;
      win.addEventListener(evt, function trWait() {
        win.removeEventListener(evt, trWait);
        marionetteScriptFinished();
      });
    }, [evt]);
  },

  goHome: function() {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      win.addEventListener('homescreenopened', function trWait() {
        win.removeEventListener('homescreenopened', trWait);
        marionetteScriptFinished();
      });
      win.dispatchEvent(new CustomEvent('home'));
    });
  },

  tapHome: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  }
};
