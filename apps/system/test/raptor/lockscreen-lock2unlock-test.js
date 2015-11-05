'use strict';

/* global setup, afterEach, marionetteScriptFinished */
/* Test from lock to unlock, how long does it take. */
setup(function(options) {
  options.phase = 'reboot';
});

afterEach(function(phase) {
  return phase.device.marionette
    .startSession()
    .then(function(client) {
      var Deferred = function() {
        this.promise = new Promise((function(res, rej) {
          this.resolve = res;
          this.reject = rej;
        }).bind(this));
        return this;
      };
      var deferred = new Deferred();
      deferred.promise = deferred.promise.then(function() {
        client.deleteSession();
      }).catch(function(err) {
        console.error(err);
        throw err;
      });
      client.switchToFrame();
      client.executeAsyncScript(function() {
        var settings = window.wrappedJSObject.navigator.mozSettings;
        var lock = settings.createLock();
        lock.set({
          'lockscreen.enabled': true
        }).then(function() {
          marionetteScriptFinished(null, 'success');
        }).catch(function(err) {
          marionetteScriptFinished(err, 'falied');
        });
      });
      client.executeScript(function() {
        window.wrappedJSObject.Service.request('lock');
      });
      client.waitFor(function() {
        return client.executeScript(function() {
          return window.wrappedJSObject.Service.query('locked');
        });
      });
      client.executeScript(function() {
        window.wrappedJSObject.Service.request('unlock');
      });
      client.waitFor(function() {
        return client.executeScript(function() {
          return !window.wrappedJSObject.Service.query('locked');
        });
      });
      client.executeAsyncScript(function() {
        var settings = window.wrappedJSObject.navigator.mozSettings;
        var lock = settings.createLock();
        lock.set({
          'lockscreen.enabled': false
        }).then(function() {
          marionetteScriptFinished(null, 'success');
        }).catch(function(err) {
          marionetteScriptFinished(err, 'falied');
        });
      }, function(err) {
        if (err) {
          deferred.reject(err);
        }
        deferred.resolve();
      });
      return deferred.promise;
  });
});
