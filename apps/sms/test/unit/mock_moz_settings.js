'use strict';

(function(exports) {
  // Set default message size with 300KB
  var settings = {
    'dom.mms.operatorSizeLimitation' : 300
  };

  function mns_mLockSet(obj) {
    for (var key in obj) {
      settings[key] = obj[key];
    }
  }

  function mns_mLockGet(key) {
    var resultObj = {};
    resultObj[key] = settings[key];
    var settingsRequest = {
      result: resultObj
    };

    setTimeout(function() {
      if (settingsRequest.onsuccess) {
        settingsRequest.onsuccess();
      }
    });

    return settingsRequest;
  }

  function mns_createLock() {
    return {
      set: mns_mLockSet,
      get: mns_mLockGet
    };
  }

  var MockMozSettings = {
    createLock: mns_createLock
  };

  exports.MockMozSettings = MockMozSettings;

})(this);
