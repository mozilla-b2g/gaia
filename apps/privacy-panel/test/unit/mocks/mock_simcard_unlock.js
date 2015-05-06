define(function() {
  'use strict';

  var validPIN = '1234';
  var retryCount = 3;

  var MockSimcardUnlock = { // fake DOMRequest
    unlockCardLock: function(options) {
      var valid = (options.pin === validPIN);
      return {
        set onsucess(callback) {
          if (valid) {
            retryCount = 3;
            callback();
          }
        },
        set onerror(callback) {
          if (!valid) {
            retryCount--;
            callback();
          }
        },
        get error() {
          return valid ? {} : { retryCount: retryCount };
        }
      };
    }
  };

  return MockSimcardUnlock;
});

