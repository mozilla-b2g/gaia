(function() {
  'use strict';

  function PanelRPP() {}

  PanelRPP.prototype = {

    /**
     * Initialize RPP panel and all its sections
     * 
     * @method init
     * @constructor
     */
    init: function() {
      window.pp.rppAuth.init();
      window.pp.rppScreenLock.init();
      window.pp.rppPassCode.init();
    }

  };

  window.pp = window.pp || {};
  window.pp.rpp = new PanelRPP();
})();
