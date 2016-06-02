(function() {
  'use strict';

  if (navigator.mozAlarms) {
    return;
  }

  navigator.mozAlarms = {
    add: function() {
      var returnResult = {};

      setTimeout(() => {
        returnResult.result = {};
        if (typeof returnResult.onsuccess === 'function') {
          returnResult.onsuccess.call(returnResult);
        }
      });

      return returnResult;
    },

    remove: function() {}
  };
})();
