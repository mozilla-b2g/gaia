'use strict';

var Promise = require('es6-promise').Promise;   // jshint ignore:line

(function(module) {

  var LockScreenPasscodeUnlockActions = function() {};

  /**
   * Start to perform actions.
   */
  LockScreenPasscodeUnlockActions.prototype.start =
  function(client) {
    this.Ensure = require('./ensure.js');
    this.LockScreen = require('./lockscreen.js');
    this.client = client;
    this.lockscreen = (new this.LockScreen()).start(client);
    this.lockscreen.relock();
    return this;
  };

  LockScreenPasscodeUnlockActions.prototype.ensure =
  function() {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreenPasscodeUnlockActions.prototype.activateSlidingUnlock =
  function() {
    // Due to the failure to drag the slide to right via Marionette,
    // currently to immediately trigger the event is the only way to
    // show the result of sliding to unlock.
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new CustomEvent('lockscreenslide-activate-right'));
    });
    this.client.waitFor((function() {
      return this.client.executeScript(function() {
        var screenHeight = window.wrappedJSObject.screen.height;
        var panel = window.wrappedJSObject.document
                      .querySelector('#lockscreen-panel-passcode');
        var panelTop = panel.getBoundingClientRect().top;
        if (screenHeight === panelTop) {
          return true;
        } else {
          return false;   // True: only when it rises to 100% fit the screen.
        }
      });
    }).bind(this));
  };

  LockScreenPasscodeUnlockActions.prototype.pressKey = function(keyChar) {
    var selector = '#lockscreen-passcode-pad a[data-key="' + keyChar + '"]';
    // To wait it displayed.
    this.client.helper.waitForElement(selector).click();
  };

  LockScreenPasscodeUnlockActions.prototype.waitForUnlock = function() {
    return new Promise((function(resolve, reject) {
      this.client.waitFor((function() {
        var frame = this.client.findElement('#lockscreen-frame');
        return !frame.displayed();
      }).bind(this));
      if (this.client.executeScript(function() {
        return window.wrappedJSObject.Service.query('locked');
      })) {
        reject('Not unlocked before screen off');
      } else {
        resolve();
      }
    }).bind(this));
  };

  LockScreenPasscodeUnlockActions.prototype.notUnlock = function() {
    return new Promise((function(resolve, reject) {
      if (this.client.executeScript(function() {
        return window.wrappedJSObject.Service.query('locked');
      })) {
        resolve();
      } else {
        reject('Unexpected unlocked');
      }
    }).bind(this));
  };

  module.exports = LockScreenPasscodeUnlockActions;
})(module);
