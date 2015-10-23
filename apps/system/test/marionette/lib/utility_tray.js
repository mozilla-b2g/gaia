'use strict';
(function(module) {

  var UtilityTray = function(client) {
    this.client = client;
    this.actions = client.loader.getActions();
    var width = client.executeScript(function() {
      return window.innerWidth;
    });
    this.halfWidth = width / 2;

    var height = client.executeScript(function() {
      return window.innerHeight;
    });
    this.halfHeight = height / 2;

    this.waitForLoaded();
  };

  UtilityTray.prototype = {
    Selectors: {
      element: '#utility-tray',
      screen: '#screen.utility-tray',
      notifContainer: '#desktop-notifications-container',
      notification: '#desktop-notifications-container .notification',
      grippy: '#utility-tray-grippy',
      invisibleGrippy: '#tray-invisible-gripper',
      quickSettings: '#quick-settings-full-app',
    },

    waitForLoaded: function() {
      return this.client.waitFor(function() {
        return this.client.executeScript(function() {
          var win = window.wrappedJSObject;
          return !!(win.UtilityTray &&
                    win.UtilityTray.motion.el.scrollTopMax > 0);
        });
      }.bind(this));
    },

    get visible() {
      return !!this.screenElement;
    },

    get screenElement() {
      return this.client.findElement(this.Selectors.screen);
    },

    get _motionState() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.UtilityTray.motion.state;
      });
    },

    get shown() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.UtilityTray.shown;
      });
    },

    get isAriaHidden() {
      return this.client.findElement(this.Selectors.element)
        .getAttribute('aria-hidden') === 'true';
    },

    get quickSettings() {
      return this.client.helper.waitForElement(this.Selectors.quickSettings);
    },

    get firstNotification() {
      return this.client.findElement(this.Selectors.notification);
    },

    waitForOpened: function() {
      this.client.waitFor(function() {
        var element = this.client.findElement(this.Selectors.element);
        var rect = element.scriptWith(function(el) {
          return el.getBoundingClientRect();
        });
        var expectedTop = 0;
        return (rect.top === expectedTop) && this._motionState === 'open';
      }.bind(this));
    },

    waitForClosed: function() {
      this.client.waitFor(function() {
        var element = this.client.findElement(this.Selectors.element);
        var rect = element.scriptWith(function(el) {
          return el.getBoundingClientRect();
        });
        var expectedTop = -rect.height;
        return (rect.top === expectedTop) && this._motionState === 'closed';
      }.bind(this));
    },

    open: function() {
      this.client.executeAsyncScript(function() {
        var win = window.wrappedJSObject;
        win.addEventListener('utility-tray-overlayopened', function wait() {
          win.removeEventListener('utility-tray-overlayopened', wait);
          marionetteScriptFinished();
        });
        win.Service.request('UtilityTray:show', true);
      });
    },

    close: function() {
      this.client.executeAsyncScript(function() {
        var win = window.wrappedJSObject;
        win.addEventListener('utility-tray-overlayclosed', function wait() {
          win.removeEventListener('utility-tray-overlayclosed', wait);
          marionetteScriptFinished();
        });
        win.Service.request('UtilityTray:hide');
      });
    },

    swipeDown: function swipeDown() {
      var element = this.client.findElement(this.Selectors.invisibleGrippy);
      this.client.waitFor(function() {
        return element.displayed;
      });
      this.actions
        .flick(element, 10, 10, 10, 400, 500)
        .perform();
    },

    swipeUp: function swipeUp() {
      var element = this.client.findElement(this.Selectors.grippy);
      this.client.waitFor(function() {
        return element.displayed;
      });
      this.actions
        .flick(element, 10, 10, 10, -400, 500)
        .perform();
    }

  };

  module.exports = UtilityTray;
})(module);
