/**
 * To provide a abstract LockScreen, thus we can change the implementation
 * to get closer with user's behavior (unlock via sliding; lock with button).
 */

'use strict';
var Promise = require('es6-promise').Promise;   // jshint ignore:line

(function(module) {
  var LockScreen = function() {};

  LockScreen.prototype.start = function(client) {
    this.Ensure = require('./ensure.js');
    this.client = client;
    this.selector = {
      lockSlider: '#lockscreen-icon-container'
    };
    // XXX: After we make LockScree as an iframe or app, we need this to
    // indicate to switch to which frame.
    this.lockScreenFrameOrigin = 'app://lockscreen.gaiamobile.org';
    this.decorateMethods();
    return this;
  };

  // Do AOP things: add switch to System frame before executing every method.
  // This is because LockScreen commands should be fired via System,
  // to avoid switching to wrong frame without proper permissions and components
  LockScreen.prototype.decorateMethods =
  function() {
    Object.keys(LockScreen.prototype).forEach((function(methodName) {
      if ('decorateMethods'  === methodName ||
          'ensure' === methodName) {
        return;
      }
      var method = this[methodName];
      this[methodName] = (function() {
        this.ensure().frame();
        method.apply(this, arguments);
      }).bind(this);
    }).bind(this));
  };

  LockScreen.prototype.ensure =
  function() {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreen.prototype.setEnable =
  function(value) {
    this.ensure().settings();
    this.client.executeAsyncScript(function(value) {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var lock = settings.createLock();
      var result = lock.set({
        'lockscreen.enabled': value
      });
      result.onsuccess = function() {
        result = null;
        lock = null;
        settings = null;
        marionetteScriptFinished();
      };
      result.onerror = function() {
        marionetteScriptFinished();
        throw new Error('Cannot set LockScreen as ' + value);
      };
    }, [value]);
  };

  LockScreen.prototype.getEnable =
  function(cb) {
    this.ensure().settings();
    this.client.executeAsyncScript(function() {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var lock = settings.createLock();
      var result = lock.get('lockscreen.enabled');
      result.onerror = function() {
        throw new Error('Cannot get LockScreen enabled value');
      };
      result.onsuccess = function() {
        marionetteScriptFinished(result.result);
        result = null;
        lock = null;
        settings = null;
      };
    }, cb);
  };

  LockScreen.prototype.setPasscode =
  function(_passcode, cb) {
    this.ensure().settings();
    this.client.executeAsyncScript(function(passcode) {
      try {
        window.wrappedJSObject.PasscodeHelper.set(passcode);
      } catch(e) {
        throw e;
      }
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var lock = settings.createLock();
      lock.set({
        'lockscreen.passcode-lock.enabled': true
      }).then((function() {
	marionetteScriptFinished();
      }).bind(this)).catch(function(e) {
        throw new Error('Cannot set LockScreen passcode enabled value');
      });
    }, [_passcode], (function() {
      // To end the flow when we get the value.
      // XXX: In fact, it doesn't matter whether the value is true,
      // since it's always true. The mysterious error is if we don't
      // check the value, the set action won't be executed.
      // This is an issues that the reason and symptom is still unknown.
      this.checkPasscodeEnabled(cb);
    }).bind(this));
  };

  LockScreen.prototype.checkPasscodeEnabled =
  function(cb) {
    this.client.executeAsyncScript(function() {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var lock = settings.createLock();
      lock.get('lockscreen.passcode-lock.enabled')
      .then(function(result) {
        marionetteScriptFinished(result['lockscreen.passcode-lock.enabled']);
      }).catch(function(e) {
        throw new Error('Cannot get LockScreen passcode enabled value');
      });
    }, [], cb);
  };

  LockScreen.prototype.disable =
  function() {
    this.setEnable(false);
    return this;
  };

  LockScreen.prototype.enable =
  function() {
    this.setEnable(true);
    return this;
  };

  // XXX: Marionette client has a bug: LockScreen launched during
  // booting would be broken. Need to relock after it to do
  // all LockScreen test.
  //
  // To do a test with LockScreen, disable it in the primary settings
  // passed to the client, and then call this method to relock it.
  LockScreen.prototype.relock =
  function() {
    this.setEnable(true);
    this.lock();
    return this;
  };

  // Would lock the screen and switch to the frame.
  LockScreen.prototype.lock =
  function() {
    this.getEnable(function(err, value) {
      if (err) {
        throw err;
      } else if (!value) {
        throw new Error('Cannot lock while it\'s disable');
      }
    });

    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request('lock', {
        forcibly: true
      });
    });
    this.ensure()
      .must((function() {
        try {
          // Make sure the frame is displayed.
          this.ensure().frame(this.lockScreenFrameOrigin);
          return true;
        } catch (e) {
          return false;
        }
      }).bind(this))
      .frame(this.lockScreenFrameOrigin);
    return this;
  };

  // Would unlock the screen and switch to the System frame.
  LockScreen.prototype.unlock =
  function() {
    this.ensure().frame();
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request('unlock', {
        forcibly: true
      });
    });
    this.ensure()
      .must((function() {
        try {
          // Make sure the LockScreen frame is not displayed.
          this.ensure().frame(this.lockScreenFrameOrigin);
          return false;
        } catch (e) {
          return true;
        }
      }).bind(this));
    return this;
  };

  // Slide to unlock the screen
  LockScreen.prototype.slideToUnlock =
  function(cb) {
    this._slideLockTo('right', cb);
  };

  // Slide to open camera app
  LockScreen.prototype.slideToOpenCamera =
  function(cb) {
    this._slideLockTo('left', cb);
  };

  // Slide an element given x and y offsets
  LockScreen.prototype._slideByOffset =
  function(element, x, y, cb) {
    var actions = this.client.loader.getActions();
    // actions.flick doesn't work for some reason. Resorted to breaking it
    // down to press > move > release. The waiting time in between each action
    // is necessary.
    actions.press(element).wait(0.5).moveByOffset(x, y).wait(0.5).release().
      perform(cb);
  };

  // Slide lockscreen to left or right
  LockScreen.prototype._slideLockTo =
  function(direction, cb) {
    this.ensure().frame();
    var lockSlider = this.client.findElement(this.selector.lockSlider);
    var size = lockSlider.size();
    switch (direction) {
      case 'left':
        this._slideByOffset(lockSlider, -size.width / 2, 0, cb);
        break;
      case 'right':
        this._slideByOffset(lockSlider, size.width / 2, 0, cb);
        break;
    }
  };

  module.exports = LockScreen;
})(module);
