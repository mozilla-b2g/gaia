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
    this.actions = client.loader.getActions();
    this.selector = {
      lockSlider: '#lockscreen-icon-container',
      passcodePad: '#lockscreen-passcode-pad',
      passcodeKey: 'a[data-key="#"]'
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
  function() {
    this.ensure().frame();
    this._slideLock('right');
    return this;
  };

  // Slide an element given x and y offsets
  LockScreen.prototype._slideByOffset =
  function(element, x, y) {
    // actions.flick doesn't work for some reason. Resorted to breaking it
    // down to press > move > release. The waiting time in between each action
    // is necessary.
    this.actions.
      press(element).wait(0.5).moveByOffset(x, y).wait(0.5).release().
      perform();
    return this;
  };

  // Slide lockscreen to left or right
  LockScreen.prototype._slideLock =
  function(direction) {
    var lockSlider = this.client.findElement(this.selector.lockSlider);
    var size = lockSlider.size();
    switch (direction) {
      case 'left':
        this._slideByOffset(lockSlider, -size.width / 2, 0);
        break;
      case 'right':
        this._slideByOffset(lockSlider, size.width / 2, 0);
        break;
    }
    return this;
  };

  // Type numeric passcode
  LockScreen.prototype.typePasscode = function(code) {
    var passcodePad = this.client.findElement(this.selector.passcodePad);
    this.ensure().frame();
    this.ensure().element(passcodePad).displayed();
    code.split('').forEach(function(number) {
      var keySelector = this.selector.passcodeKey.replace('#', number);
      var key = passcodePad.findElement(keySelector);
      // Using tap would cause the key to be typed twice. There has to be
      // sufficient time interval between pressing and releasing the keys
      // to avoid this problem.
      this.actions.press(key).wait(0.5).release().perform();
    }.bind(this));
  };

  module.exports = LockScreen;
})(module);
