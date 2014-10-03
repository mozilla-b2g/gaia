'use strict';
/*
 * This is a mock for the API navigator.mozSettings. This is supposed to be used
 * in unit tests to simulate the API and exercize all branches of your code. It
 * should simulate it correctly for get/set operations, and for observers as
 * well.
 *
 * To use it, you need to have the following code in your test:
 *
 * var realMozSettings;
 * suiteSetup(funcction() {
 *   realMozSettings = navigator.mozSettings
 *   navigator.mozSettings = MockNavigatorSettings
 * });
 *
 * suiteTeardown(function() {
 *   navigator.mozSettings = realMozSettings;
 * });
 *
 * setup(function() {
 *   MockNavigatorSettings.mSetup();
 * });
 *
 * teardown(function() {
 *   MockNavigatorSettings.mTeardown();
 * });
 *
 * This mock is stateful until we reset it with mSetup or mTeardown. This means
 * that any setting that has been set can also be retrieved.
 * MockNavigatorSettings.mSettings gives a direct access to the stored settings.
 * Then during a test, it's possible to check what setting(s) a code has set, or
 * set settings before the test starts.
 *
 * In a normal operation, this mock uses setTimeout to properly simulate that
 * mozSettings' get and set operations are asynchronous. Because setTimeout can
 * have inconvenients (is slow, could produce races, intermittents, and sinon's
 * fake timers do not play well), this mock also has a synchronous way for the
 * get operation only:
 *
 * - you need to set the boolean MockNavigatorSettings.mSyncRepliesOnly to true
 *   after calling mSetup.
 * - then you can call mReplyToRequests to answer any pending request in a
 *   synchronous way.
 *
 */
(function(window) {
  var observers, settings, removedObservers, requests, timeouts;
  var _mSyncRepliesOnly, _onsettingchange;

  function mns_mLockSet(obj) {
    // Set values.
    for (var key in obj) {
      settings[key] = obj[key];
    }

    // Trigger observers to mimic real mozSettings implementation.
    for (key in obj) {
      mns_mTriggerObservers(
        key,
        { settingName: key, settingValue: obj[key] }
      );
    }

    var req = {
      onsuccess: null,
      onerror: null
    };

    timeouts.push(setTimeout(function() {
      if (req.onsuccess) {
        req.onsuccess();
      }
    }));

    return req;
  }

  function mns_clearRequests() {
    requests = [];
    if (timeouts) {
      timeouts.forEach(clearTimeout);
    }
    timeouts = [];
  }

  function mns_mReplyToRequests() {
    try {
      var currentRequests = requests;
      requests = [];
      currentRequests.forEach(function(request) {
        if (request.onsuccess) {
          request.onsuccess({
            target: request
          });
        }
      });
    } catch(e) {
    }
  }

  function mns_mLockGet(key) {
    var resultObj = {};
    if (key === '*') {
      resultObj = settings;
    } else {
      resultObj[key] = settings[key];
    }
    var settingsRequest = {
      result: resultObj,
      addEventListener: function(name, cb) {
        settingsRequest['on' + name] = cb;
      }
    };

    if (!_mSyncRepliesOnly) {
      timeouts.push(setTimeout(function() {
        if (settingsRequest.onsuccess) {
          settingsRequest.onsuccess();
        }
      }));
    } else {
      requests.push(settingsRequest);
    }

    return settingsRequest;
  }

  function mns_addObserver(name, cb) {
    observers[name] = observers[name] || [];
    observers[name].push(cb);
  }

  function mns_removeObserver(name, cb) {
    removedObservers[name] = removedObservers[name] || [];
    removedObservers[name].push(cb);

    if (observers && observers[name]) {
      var index = observers[name].indexOf(cb);
      if (index > -1) {
        observers[name].splice(index, 1);
      }
    }
  }

  function mns_createLock() {
    return {
      set: mns_mLockSet,
      get: mns_mLockGet
    };
  }

  function mns_mTriggerObservers(name, args) {
    var theseObservers = observers[name];
    if (theseObservers) {
      theseObservers.forEach(function(func) {
        func(args);
      });
    }

    if (_onsettingchange) {
      _onsettingchange(args);
    }
  }

  function mns_reset() {
    observers = {};
    settings = {};
    removedObservers = {};
    mns_clearRequests();
    _mSyncRepliesOnly = false;
    _onsettingchange = null;
  }

  function mns_set(obj) {
    for (var p in obj) {
      settings[p] = obj[p];
    }
  }

  mns_reset();

  window.MockNavigatorSettings = {
    addObserver: mns_addObserver,
    removeObserver: mns_removeObserver,
    createLock: mns_createLock,

    mClearRequests: mns_clearRequests,
    mReplyToRequests: mns_mReplyToRequests,
    mTriggerObservers: mns_mTriggerObservers,
    mSetup: mns_reset,
    mTeardown: mns_reset,
    mSet: mns_set,

    get onsettingchange() {
      return _onsettingchange;
    },
    set onsettingchange(value) {
      _onsettingchange = value;
    },
    get mSyncRepliesOnly() {
      return _mSyncRepliesOnly;
    },
    set mSyncRepliesOnly(value) {
      _mSyncRepliesOnly = value;
    },
    get mObservers() {
      return observers;
    },
    get mSettings() {
      return settings;
    },
    get mRemovedObservers() {
      return removedObservers;
    },
    get mRequests() {
      return requests;
    }
  };

})(window);
