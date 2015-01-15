'use strict';
(function(module) {

  var UtilityTray = function(client) {
    this.client = client;
    this.actions = new Actions(client);
    var width = client.executeScript(function() {
      return window.innerWidth;
    });
    this.halfWidth = width / 2;

    var height = client.executeScript(function() {
      return window.innerHeight;
    });
    this.halfHeight = height / 2;
  };

  var Actions = require('marionette-client').Actions;

  UtilityTray.prototype = {
    Selectors: {
      element: '#utility-tray',
      screen: '#screen.utility-tray',
      notifContainer: '#desktop-notifications-container',
      grippy: '#utility-tray-grippy'
    },

    get visible() {
      return this.client.findElement(this.Selectors.screen);
    },

    waitForOpened: function() {
      this.client.waitFor(function() {
        var element = this.client.findElement(this.Selectors.element);
        var rect = element.scriptWith(function(el) {
          return el.getBoundingClientRect();
        });
        var expectedTop = 30;
        return (rect.top === expectedTop);
      }.bind(this));
    },

    waitForClosed: function() {
      this.client.waitFor(function() {
        var element = this.client.findElement(this.Selectors.element);
        var rect = element.scriptWith(function(el) {
          return el.getBoundingClientRect();
        });
        var expectedTop = -460;
        return (rect.top === expectedTop);
      }.bind(this));
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
    },

    swipeDown: function swipeDown(element) {
      this.client.waitFor(function() {
        return element.displayed;
      });

      // Works better than actions.flick().
      this.actions
        .press(element)
        .moveByOffset(0, this.halfHeight)
        .release()
        .perform();
    },

    swipeUp: function swipeUp(element) {
      var halfWidth = this.halfWidth;
      this.client.waitFor(function() {
        return element.displayed;
      });
      this.actions
        .flick(element, halfWidth, 10, halfWidth, -this.halfHeight, 100)
        .perform();
    }

  };

  module.exports = UtilityTray;
})(module);
