/**
 * Remote Protection panel.
 * 
 * @module RpPanel
 * @return {Object}
 */
define([
  'rp/auth',
  'rp/screenlock',
  'rp/passcode'
],

function(rpAuth, rpScreenLock, rpPassCode) {
  'use strict';

  function RpPanel() {}

  RpPanel.prototype = {

    /**
     * Initialize RP panel and all its sections
     * 
     * @method init
     * @constructor
     */
    init: function() {
      rpAuth.init();
      rpScreenLock.init();
      rpPassCode.init();
    }

  };

  return new RpPanel();

});
