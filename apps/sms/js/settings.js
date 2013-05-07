'use strict';
/*
  Message app settings related value and utilities.
*/

var Settings = {
  mmsSizeLimitation: 0, // default mms message size limitation is unlimited.
  // Set MMS size limitation:
  // If operator does not specify MMS message size, we leave the decision to
  // MessageManager and return nothing if we can't get size limitation from db.
  getMmsSizeLimitation: function ms_getMmsSizeLimitation(callback) {
    var key = 'dom.mms.operatorSizeLimitation';
    var settings = navigator.mozSettings;
    if (typeof callback !== 'function')
      return;

    if (!settings) {
      callback();
      return;
    }

    var req = settings.createLock().get(key);
    req.onsuccess = function mm_getSizeSuccess() {
      var size = req.result[key];
      if (!size || isNaN(size)) {
        callback();
      } else {
        callback(size * 1024);
      }
    };
    req.onerror = callback;
  }
};
