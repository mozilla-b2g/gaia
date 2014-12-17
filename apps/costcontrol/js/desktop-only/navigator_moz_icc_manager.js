(function() {
  'use strict';

  if (navigator.mozIccManager) {
    return;
  }

  navigator.mozIccManager = {
    iccIds: ['1234575100210522938'],

    getIccById: function(id) {
      return {
        cardState: 'ready',
        iccInfo: {
          mcc: id,
          mnc: id
        }
      };
    }
  };
})();
