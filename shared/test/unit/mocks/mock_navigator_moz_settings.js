'use strict';

(function(window) {
  var observers = {},
      // Set default message size with 300KB
      settings = {
        'dom.mms.operatorSizeLimitation' : 300,
        'homegesture.enabled': false,
        'software-button.enabled': false
      },
      removedObservers = {},
      requests = [];

  function mns_mLockSet(obj) {
    // Set values.
    for (var key in obj) {
      settings[key] = obj[key];
    }

    // Trigger observers to mimic real mozSettings implementation.
    for (var key in obj) {
      mns_mTriggerObservers(
        key,
        { settingName: key, settingValue: obj[key] }
      );
    }

    var req = {
      onsuccess: null,
      onerror: null
    };

    setTimeout(function() {
      if (req.onsuccess) {
        req.onsuccess();
      }
    });

    return req;
  }

  function mns_clearRequests() {
    requests = [];
  }

  function mns_mReplyToRequests() {
    try {
      requests.forEach(function(request) {
        if (request.onsuccess) {
          request.onsuccess({
            target: request
          });
        }
      });
    }
    finally {
      requests = [];
    }
  }

  function mns_mLockGet(key) {
    var resultObj = {};
    resultObj[key] = settings[key];
    var settingsRequest = {
      result: resultObj,
      addEventListener: function(name, cb) {
        settingsRequest['on' + name] = cb;
      }
    };

    if (!MockNavigatorSettings.mSyncRepliesOnly) {
      setTimeout(function() {
        if (settingsRequest.onsuccess) {
          settingsRequest.onsuccess();
        }
      });
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

    var index = observers[name].indexOf(cb);
    if (index > -1) {
      observers[name].splice(index, 1);
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
    requests = [];
  }

  window.MockNavigatorSettings = {
    addObserver: mns_addObserver,
    removeObserver: mns_removeObserver,
    createLock: mns_createLock,

    mClearRequests: mns_clearRequests,
    mReplyToRequests: mns_mReplyToRequests,
    mTriggerObservers: mns_mTriggerObservers,
    mTeardown: mns_teardown,
    mSyncRepliesOnly: false,

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

})(this);
