'use strict';

var assert = require('chai').assert;

/**
 * A Marionette test helper for calling interactive notification.
 */

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function InteractiveNotifications(client) {
  this.client = client.scope({ searchTimeout: 120 * 1000 });
}

module.exports = InteractiveNotifications;

var Selector = InteractiveNotifications.Selector = {};
Selector.banner = 'smart-banner#notification-container';
Selector.msgTitle = Selector.banner + ' span#notification-title';
Selector.msgBody = Selector.banner + ' span#notification-body';
Selector.msgBtnGroup = Selector.banner + ' menu#notification-button-group';
Selector.msgBtn0 = Selector.banner + ' smart-button#notification-button-0';
Selector.msgBtn1 = Selector.banner + ' smart-button#notification-button-1';

InteractiveNotifications.prototype = {

  get banner() {
    return this.client.findElement(Selector.banner);
  },

  get msgTitle() {
    return this.client.findElement(Selector.msgTitle);
  },

  get msgBody() {
    return this.client.findElement(Selector.msgBody);
  },

  get msgBtnGroup() {
    return this.client.findElement(Selector.msgBtnGroup);
  },

  get msgBtn0() {
    return this.client.findElement(Selector.msgBtn0);
  },

  get msgBtn1() {
    return this.client.findElement(Selector.msgBtn1);
  },

  show: function (msg) {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function (msg) {
      window.wrappedJSObject.interactiveNotifications
        .showNotification('notification', msg);
      marionetteScriptFinished();
    }, [msg]);
  },

  waitForOpened: function () {
    var banner = this.banner;
    this.client.waitFor(function() {
      var classes = banner.getAttribute('class');
      return classes.indexOf('opened') != -1;
    });
  },

  waitForClosed: function () {
    var banner = this.banner;
    this.client.waitFor(function() {
      var classes = banner.getAttribute('class');
      return classes.indexOf('hidden') != -1;
    });
    // After closing, focus should be on background app
    banner.scriptWith(function(banner) {
      return document.activeElement !== banner &&
        document.activeElement.getAttribute('src') ===
          'app://smart-home.gaiamobile.org/index.html';
    }, function (err, focusOnApp) {
      assert.ok(focusOnApp, 'Not focus on app after closing');
    });
  }
};
