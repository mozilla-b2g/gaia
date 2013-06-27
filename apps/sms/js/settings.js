'use strict';
/*
  Message app settings related value and utilities.
*/

var Settings = {
  mmsSizeLimitation: 300 * 1024, // Default mms message size limitation is 300K.

  // Set MMS size limitation:
  // If operator does not specify MMS message size, we leave the decision to
  // MessageManager and return nothing if we can't get size limitation from db.
  init: function ms_getMmsSizeLimitation() {
    var key = 'dom.mms.operatorSizeLimitation';
    var settings = navigator.mozSettings;

    if (!settings) {
      return;
    }

    var req = settings.createLock().get(key);
    req.onsuccess = function mm_getSizeSuccess() {
      var size = req.result[key];
      if (size && !isNaN(size)) {
        Settings.mmsSizeLimitation = size;
      }
    };
  }
};
