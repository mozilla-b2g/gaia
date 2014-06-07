/* global Promise */
/* exported VersionHelper */
'use strict';

(function(exports) {

  // Helper to work with version strings
  // e.g. 2.0.0.1-prerelease becomes { major: 2, minor: 0 }
  function Version(str) {
    str = str || '0.0';
    var parts = str.split('.');
    this.major = parts[0];
    this.minor = parts[1];
    this.toString = function() {
      return '' + str;
    };
  }

  function InfoResult(current, previous) {
    this.current = current;
    this.previous = previous;
  }

  InfoResult.prototype.isUpgrade = function() {
    var prev = this.previous,
        curr = this.current,
        isUpgrade = false;
    // dont treat lack of previous version info as an upgrade
    if (prev && curr) {
      isUpgrade = curr.major > prev.major || curr.minor > prev.minor;
    }
    return isUpgrade;
  };

  InfoResult.prototype.delta = function() {
    var prev = this.previous,
        curr = this.current;
    var delta = '';

    if (prev) {
      delta += prev.major + '.' +prev.minor;
    }
    delta += '..';
    if (curr) {
      delta += curr.major + '.' + curr.minor;
    }
    return delta;
  };

  // Helper to get settings
  function getSetting(setting, cb, errback) {
    var req = navigator.mozSettings.createLock().get(setting);
    req.onsuccess = function() {
      var value = req.result[setting];
      if(typeof cb === 'function') {
        cb(value);
      }
    };
    req.onerror = function() {
      if(typeof errback === 'function') {
        errback(req.error);
      }
    };
  }

  function getCurrent() {
    return new Promise(function(resolve, reject) {
      getSetting('deviceinfo.os', function(value) {
        resolve(value ? new Version(value) : null);
      }, function(err) {
        reject(err);
      });
    });
  }

  function getPrevious() {
    return new Promise(function(resolve, reject) {
      // XXX: we return null version when previous_os lookup fails
      getSetting('deviceinfo.previous_os', function(value) {
        resolve(value ? new Version(value) : null);
      }, function(err) {
        resolve(null);
      });
    });
  }

  function updatePrevious(str) {
    var currentPromise = str ? Promise.resolve(new Version(str)) :
                                getCurrent();
    var setPromise = new Promise(function(resolve, reject) {
      currentPromise.then(function(version) {
        // guard against empty deviceinfo.os
        if (version) {
          var req = navigator.mozSettings.createLock().set({
            'deviceinfo.previous_os': version.toString()
          });
          req.onsuccess = function() {
            resolve(version);
          };
          req.onerror = function() {
            var reason = req.error;
            reject(reason);
          };
        } else {
          resolve(null);
        }
      }, function(err) {
        reject('Error getting previous version: ', err);
      });
    });
    return setPromise;
  }

  function getVersionInfo() {
    var info = new InfoResult();
    var infoPromise = new Promise(function(resolve, reject) {
      Promise.all([
        getCurrent().then(function(version) {
          info.current = version;
        }),
        getPrevious().then(function(version) {
          info.previous = version;
        })
      ]).then(function() {
        resolve(info);
      }, reject);
    });
    return infoPromise;
  }

  exports.VersionHelper = {
    updatePrevious: updatePrevious,
    getVersionInfo: getVersionInfo
  };

})(window);
