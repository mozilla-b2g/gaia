/**
 * Remote Privacy Protection panel.
 * 
 * @module RppPanel
 * @return {Object}
 */
define([
  'rpp/auth',
  'rpp/screenlock',
  'rpp/passcode',
],

function(rppAuth, rppScreenLock, rppPassCode) {
  'use strict';

  function RppPanel() {}

  RppPanel.prototype = {

    /**
     * Initialize RPP panel and all its sections
     * 
     * @method init
     * @constructor
     */
    init: function() {
      rppAuth.init();
      rppScreenLock.init();
      rppPassCode.init();
    }

  };

  return new RppPanel();

});
