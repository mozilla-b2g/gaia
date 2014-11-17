/**
 * To provide a abstract LockScreen, thus we can change the implementation
 * to get closer with user's behavior (unlock via sliding; lock with button).
 */
'use strict';
(function(module) {
  var LockScreen = function() {};

  LockScreen.prototype.start = function(client) {
    this.Ensure = require('./ensure.js');
    this.client = client;
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

  module.exports = LockScreen;
})(module);
