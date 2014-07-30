function System(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = System;

System.URL = 'app://system.gaiamobile.org/manifest.webapp';

System.Selector = Object.freeze({
  statusbar: '#statusbar',
  statusbarBackground: '#statusbar-background',
  statusbarLabel: '#statusbar-label',
  topPanel: '#top-panel',
  leftPanel: '#left-panel',
  rightPanel: '#right-panel',
  utilityTray: '#utility-tray'
});

System.prototype = {
  client: null,

  get statusbar() {
    return this.client.findElement(System.Selector.statusbar);
  },

  get statusbarLabel() {
    return this.client.findElement(System.Selector.statusbarLabel);
  },

  get utilityTray() {
    return this.client.findElement(System.Selector.utilityTray);
  },

  get topPanel() {
    return this.client.findElement(System.Selector.topPanel);
  },

  get leftPanel() {
    return this.client.findElement(System.Selector.leftPanel);
  },

  get rightPanel() {
    return this.client.findElement(System.Selector.rightPanel);
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

  waitForStartup: function() {
    var osLogo = this.client.findElement('#os-logo');
    this.client.waitFor(function() {
      return osLogo.getAttribute('class') == 'hide';
    });
  },

  goHome: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  },

  stopClock: function() {
    var client = this.client;
    var clock = client.executeScript(function() {
      return window.wrappedJSObject.StatusBar.icons.time;
    });
    client.executeScript(function() {
      window.wrappedJSObject.StatusBar.toggleTimeLabel(false);
    });
    client.waitFor(function() {
      return !clock.displayed();
    });
  },

  stopDevtools: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.developerHUD.stop();
    });
  }
};
