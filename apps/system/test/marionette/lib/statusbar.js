/* global module */
/* exported StatusBar */

'use strict';

(function(module) {

  var StatusBar = function(client) {
    this.client = client;
    this.init();
  };

  // Icons sorted by priority.
  StatusBar.Icons = [
    'emergencyCallback',
    'battery',
    'recording',
    'airplaneMode',
    'wifi',
    'mobileConnection',
    'time',
    'debugging',
    'download',
    'geolocation',
    'networkActivity',
    'tethering',
    'bluetoothTransfer',
    'bluetooth',
    'nfc',
    'usb',
    'alarm',
    'bluetoothHeadphone',
    'mute',
    'callForwardings',
    'playing',
    'headphone',
    //'sms', // Not currently implemented.
    'operator'
  ];

  StatusBar.Selector = Object.freeze({
    operator: '.sb-icon-operator',
    sms: '.sb-icon-sms',
    alarm: '.sb-icon-alarm',
    playing: '.sb-icon-playing',
    headphone: '.sb-icon-headphone',
    bluetoothHeadphone: '.sb-icon-bluetooth-headphone',
    callForwardings: '.sb-icon-call-forwarding',
    geolocation: '.sb-icon-geolocation',
    recording: '.sb-icon-recording',
    mute: '.sb-icon-mute',
    usb: '.sb-icon-usb',
    download: '.sb-icon-download',
    emergencyCallback: '.sb-icon-emergency-callback',
    nfc: '.sb-icon-nfc',
    bluetoothTransfer: '.sb-icon-bluetooth-transfer',
    bluetooth: '.sb-icon-bluetooth',
    tethering: '.sb-icon-tethering',
    networkActivity: '.sb-icon-network-activity',
    mobileConnection: '.sb-icon-mobile-connection',
    wifi: '.sb-icon-wifi',
    airplaneMode: '.sb-icon-airplane-mode',
    battery: '.sb-icon-battery',
    time: '.sb-icon-time',
    debugging: '.sb-icon-debugging',

    statusbar: '#statusbar',
    statusbarMaximizedWrapper: '#statusbar-maximized-wrapper',
    statusbarMinimizedWrapper: '#statusbar-minimized-wrapper'
  });

  StatusBar.prototype = {
    kActiveIndicatorTimeout: null,
    client: null,

    get maximizedStatusbar() {
      var statusbar = StatusBar.Selector.statusbarMaximizedWrapper;
      return this.client.findElement(statusbar);
    },

    get minimizedStatusbar() {
      var statusbar = StatusBar.Selector.statusbarMinimizedWrapper;
      return this.client.findElement(statusbar);
    },

    showAllRunningIcons: function() {
      this.client.executeScript(function() {
        window.wrappedJSObject.Statusbar._icons.forEach(function(icon) {
          icon.element.hidden = false;
        });
      });
    },

    isVisible: function() {
      var el = this.client.findElement(StatusBar.Selector.statusbar);
      return el.displayed();
    },

    waitForAppear: function() {
      this.client.waitFor(function() {
        return this.isVisible();
      }.bind(this));
    },

    waitForDisappear: function() {
      this.client.waitFor(function() {
        return !this.isVisible();
      }.bind(this));
    },

    /**
     * Change the delay value in StatusBar.
     * @param {number=} delay The new value for delay in milliseconds.
     */
    changeDelayValue: function(iconName, delay) {
      var self = this;
      delay = parseInt(delay, 10);
      delay = !isNaN(delay) ? delay : 100;
      this.client.executeScript(function(iconName, delay) {
        self.kActiveIndicatorTimeout =
          window.wrappedJSObject[iconName].protoype.kActiveIndicatorTimeout;
        window.wrappedJSObject[iconName].prototype.kActiveIndicatorTimeout =
          delay;
      }, [iconName, delay]);
    },

    /**
     * Restore the delay in StatusBar to its original value.
     */
    restoreDelayValue: function() {
      if (this.kActiveIndicatorTimeout === null) {
        return;
      }

      var self = this;
      this.client.executeScript(function() {
        window.wrappedJSObject.Statusbar.kActiveIndicatorTimeout =
          self.kActiveIndicatorTimeout;
        self.kActiveIndicatorTimeout = null;
      });
    },

    /**
     * Dispatch an event of type `eventType` from window.
     * @param {string} eventType
     */
    dispatchEvent: function(eventType) {
      this.client.executeScript(function(eventType) {
        var evt = new CustomEvent(eventType);
        window.wrappedJSObject.dispatchEvent(evt);
      }, [eventType]);
    },

    /**
     * Dispatch a `mozChromeEvent` of type `eventType` with the detail object
     * `detail` from window.
     * @param {string} eventType
     * @param {Object} detail
     */
    dispatchMozChromeEvent: function(eventType, detail) {
      detail = (detail !== undefined) ? detail : {};
      detail.type = eventType;

      this.client.executeScript(function(detail) {
        window.wrappedJSObject.Service.debug('will dispatch moz chrome event.');
        var evt = new CustomEvent('mozChromeEvent', {
          detail: detail
        });
        window.wrappedJSObject.dispatchEvent(evt);
        window.wrappedJSObject.Service.debug(' moz chrome event dispatched');
      }, [detail]);
    },

    /**
     * Initialize the helpers.
     */
    init: function() {
      var self = this;

      // Status bar icons have the following set of helpers:
      // * statusBar.alarm.icon
      //     return the DOM element
      // * statusBar.alarm.show()
      //     show the icon
      // * statusBar.alarm.hide()
      //     hide it
      // * statusBar.alarm.waitForIconToAppear()
      //     wait until the element appears
      // * statusBar.alarm.waitForIconToDisappear()
      //     wait until it disappears

      // Maximised status bar
      this.minimised = {};
      StatusBar.Icons.forEach(function(iconName) {
        this[iconName] = {
          get icon() {
            return self.client.findElement('#statusbar-maximized ' +
              StatusBar.Selector[iconName]);
          },
          show: showIconGenerator.call(this),
          hide: hideIconGenerator.call(this),
          waitForIconToAppear: waitForIconToAppearGenerator.call(this),
          waitForIconToDisappear: waitForIconToDisappearGenerator.call(this)
        };

        // Minimised status bar
        this.minimised[iconName] = {
          get selector() {
            return StatusBar.Selector[iconName];
          },
          get icon() {
            return self.client
              .findElement('#statusbar-minimized ' + this.selector);
          },
          show: showIconGenerator.call(this.minimised),
          hide: hideIconGenerator.call(this.minimised),
          waitForIconToAppear: waitForIconToAppearGenerator
            .call(this.minimised),
          waitForIconToDisappear: waitForIconToDisappearGenerator
            .call(this.minimised)
        };
      }.bind(this));

      // Functions generating helper functions.
      function showIconGenerator() {
        return function() {
          var icon = this.icon;
          self.client.executeScript(function(icon) {
            icon.hidden = false;
          }, [icon]);
        };
      }

      function hideIconGenerator() {
        return function() {
          var icon = this.icon;
          self.client.executeScript(function(icon) {
            icon.hidden = true;
          }, [icon]);
        };
      }

      function waitForIconToAppearGenerator() {
        return function() {
          var icon = this.icon;
          self.client.waitFor(function() {
            var display = icon.scriptWith(function(element) {
              return window.getComputedStyle(element).display;
            });
            return display !== 'none';
          });
          return icon;
        };
      }

      function waitForIconToDisappearGenerator() {
        return function() {
          var icon = this.icon;
          self.client.waitFor(function() {
            var display = icon.scriptWith(function(element) {
              return window.getComputedStyle(element).display;
            });
            return display === 'none';
          });
          return icon;
        };
      }
    }
  };

  module.exports = StatusBar;

})(module);
