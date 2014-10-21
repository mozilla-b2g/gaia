
'use strict';
(function(module) {

  var UtilityTray = function(client) {
    this.client = client;
    this.actions = new Actions(client);
  };

  var Actions = require('marionette-client').Actions;

  UtilityTray.prototype = {
    Selectors: {
      element: '#utility-tray',
      screen: '#screen.utility-tray',
      notifContainer: '#desktop-notifications-container'
    },

    get visible() {
      return this.client.findElement(this.Selectors.screen);
    },

    open: function() {
      this.client.executeAsyncScript(function() {
        var win = window.wrappedJSObject;
        win.addEventListener('utility-tray-overlayopened', function wait() {
          win.removeEventListener('utility-tray-overlayopened', wait);
          marionetteScriptFinished();
        });
        win.UtilityTray.show();
      });
    },

    close: function() {
      this.client.executeAsyncScript(function() {
        var win = window.wrappedJSObject;
        win.addEventListener('utility-tray-overlayclosed', function wait() {
          win.removeEventListener('utility-tray-overlayclosed', wait);
          marionetteScriptFinished();
        });
        win.UtilityTray.hide();
      });
    }

  };

  module.exports = UtilityTray;
})(module);
