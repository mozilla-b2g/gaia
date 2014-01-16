/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Singleton object (base object) that handle listener and events on mozIcc
 * objects in order to handle telephony-related menu items in the root panel.
 */
var TelephonySettingHelper = (function(window, document, undefined) {
  var _iccManager;
  var _mobileConnections;

  var _iccId;

  /**
   * Init function.
   */
  function tsh_init() {
    _iccManager = window.navigator.mozIccManager;
    _mobileConnections = window.navigator.mozMobileConnections;
    if (!_mobileConnections || !_iccManager) {
      return;
    }

    TelephonyItemsHandler.init();
    TelephonyItemsHandler.handleItems();

    AirplaneModeHelper.addEventListener('statechange',
      TelephonyItemsHandler.handleItems);

    tsh_addListeners();

    _iccManager.addEventListener('iccdetected',
      function iccDetectedHandler(evt) {
        if (_mobileConnections[0].iccId &&
           (_mobileConnections[0].iccId === evt.iccId)) {
          TelephonyItemsHandler.handleItems();
          tsh_addListeners();
        }
    });

    _iccManager.addEventListener('iccundetected',
      function iccUndetectedHandler(evt) {
        if (_iccId === evt.iccId) {
          _mobileConnections[0].removeEventListener('datachange',
            TelephonyItemsHandler.handleItems);
        }
    });
  }

  /**
   * Add listeners.
   */
  function tsh_addListeners() {
    _mobileConnections[0].addEventListener('datachange',
      TelephonyItemsHandler.handleItems);
    _iccId = _mobileConnections[0].iccId;

    var iccCard = _iccManager.getIccById(_iccId);
    if (!iccCard) {
      return;
    }
    iccCard.addEventListener('cardstatechange',
      TelephonyItemsHandler.handleItems);
  }

  // Public API.
  return {
    init: tsh_init
  };
})(this, document);
