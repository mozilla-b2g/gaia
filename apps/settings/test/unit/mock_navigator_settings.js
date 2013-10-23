'use strict';

(function(window) {
  var observers = {},
      settings = {},
      removedObservers = {};

  function mns_mLockSet(obj) {
    var settingsRequest = {};

    for (var key in obj) {
      settings[key] = obj[key];
    }

    setTimeout(function() {
      if (settingsRequest.onsuccess) {
        settingsRequest.onsuccess();
      }
    });

    return settingsRequest;
  }

  function mns_mLockGet() {
    var settingsRequest = {
      result: {}
    };

    setTimeout(function() {
      if (settingsRequest.onsuccess) {
        settingsRequest.onsuccess();
      }
    });

    return settingsRequest;
  }

  function mns_addObserver(name, cb) {
    observers[name] = observers[name] || [];
    observers[name].push(cb);
  }

  function mns_removeObserver(name, cb) {
    removedObservers[name] = removedObservers[name] || [];
    removedObservers[name].push(cb);
  }

  function mns_createLock() {
    return {
      set: mns_mLockSet,
      get: mns_mLockGet
    };
  }

  function mns_mTriggerObservers(name, args) {
    var theseObservers = observers[name];

    if (! theseObservers) {
      return;
    }

    theseObservers.forEach(function(func) {
      func(args);
    });
  }

  function mns_teardown() {
    observers = {};
    settings = {};
    removedObservers = {};
  }

  window.MockNavigatorSettings = {
    addObserver: mns_addObserver,
    removeObserver: mns_removeObserver,
    createLock: mns_createLock,

    mTriggerObservers: mns_mTriggerObservers,
    mTeardown: mns_teardown,
    get mObservers() {
      return observers;
    },
    get mSettings() {
      return settings;
    },
    get mRemovedObservers() {
      return removedObservers;
    }
  };

})(this);
