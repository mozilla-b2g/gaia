/* global DsdsSettings, TelephonyItemsHandler, AirplaneModeHelper */
'use strict';

/**
 * Singleton object (base object) that handle listener and events on mozIcc
 * objects in order to handle telephony-related menu items in the root panel.
 */
window.TelephonySettingHelper = (function() {
  var _iccManager;
  var _mobileConnections;

  var _iccId;

  /**
   * Init function.
   */
  function tsh_init() {
    return new Promise(function(resolve, reject) {
      _iccManager = window.navigator.mozIccManager;
      _mobileConnections = window.navigator.mozMobileConnections;

      if (!_mobileConnections || !_iccManager) {
        return resolve();
      }

      navigator.mozL10n.once(function loadWhenIdle() {
        var idleObserver = {
          time: 3,
          onidle: function() {
            navigator.removeIdleObserver(idleObserver);

            DsdsSettings.init();

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

            resolve();
          }
        };
        navigator.addIdleObserver(idleObserver);
      });
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
})();
