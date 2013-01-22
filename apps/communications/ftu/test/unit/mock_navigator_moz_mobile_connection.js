'use strict';

(function() {

  var props = ['voice', 'cardState', 'iccInfo', 'data'];

  function mnmmc_init() {
    props.forEach(function(prop) {
      Mock[prop] = null;
    });
  }

  var Mock = {
    addEventListener: function() {},
    mTeardown: mnmmc_init
  };

  mnmmc_init();

  window.MockNavigatorMozMobileConnection = Mock;
})();
