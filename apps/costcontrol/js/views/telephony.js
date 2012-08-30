/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Data Usage is in charge of display detailed information about data
// consumption per application and interface.
var TAB_TELEPHONY = 'telephony-tab';
appVManager.tabs[TAB_TELEPHONY] = (function cc_setUpDataUsage() {

  function _init() {
    var balanceFilter = document.getElementById('telephony-tab-filter');
    balanceFilter.addEventListener('click', function ccapp_onBalanceTab() {
      appVManager.changeViewTo(TAB_TELEPHONY);
    });

    _updateUI();
  }

  function _updateUI() {

  }

  return {
    init: _init,
    updateUI: _updateUI
  };
}());

// Add to views as well
Views[TAB_TELEPHONY] = appVManager.tabs[TAB_TELEPHONY];
