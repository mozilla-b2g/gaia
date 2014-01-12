(function() {
  'use strict';

  window.eme = {
    api: null,

    init: function init() {
      // TODO:
      // get deviceId from homescreen app

      eme.api.init();

      this.init = function noop() {
        // avoid multiple init calls
      };
    }
  };

})();
