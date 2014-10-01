/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Singleton object that helps to set some carrier-specific settings on boot.
 * Detects the ICC cards on boot and creates objects in charge of setting
 * some operator-specific settings relying on the ICC card.
 */
var OperatorVariant = (function() {
  var _settings = window.navigator.mozSettings;
  var _iccManager = window.navigator.mozIccManager;
  var _mobileConnections = window.navigator.mozMobileConnections;

  var MAX_NUMBER_OF_ICC_CARDS = 2;

  /** Array of OperatorVariantHandler objects. */
  var operatorVariantHandlers = [];

  /**
   * Init function.
   */
  function ov_init() {
    if (!_mobileConnections || !_iccManager || !_settings) {
      return;
    }
    var numberOfICCCards = _mobileConnections.length;
    for (var i = 0; i < numberOfICCCards; i++) {
      var mobileConnection = _mobileConnections[i];
      if (!mobileConnection.iccId) {
        operatorVariantHandlers[i] = null;
        continue;
      }
      var iccCardIndex = ov_getIccCardIndex(mobileConnection.iccId);
      operatorVariantHandlers[i] =
        OperatorVariantHandler.handleICCCard(mobileConnection.iccId,
                                             iccCardIndex);
    }

    _iccManager.addEventListener('iccdetected',
      function iccDetectedHandler(evt) {
        var iccId = evt.iccId;
        var iccCardIndex = ov_getIccCardIndex(iccId);
        operatorVariantHandlers[iccCardIndex] =
          OperatorVariantHandler.handleICCCard(iccId, iccCardIndex);
    });
  }

  /**
   * Helper function. Return the index of the ICC card given the ICC code in the
   * ICC card.
   *
   * @param {String} iccId The iccId code form the ICC card.
   *
   * @return {Numeric} The index.
   */
  function ov_getIccCardIndex(iccId) {
    for (var i = 0; i < _mobileConnections.length; i++) {
      if (_mobileConnections[i].iccId === iccId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Helper function. Ensure the value stored under the specified key is an
   * array.
   */
  function ov_ensureValueUnderKeyIsArray(key) {
    return new Promise(function(resolve, reject) {
      var getReq = _settings.createLock().get(key);
      getReq.onsuccess = function() {
        var originalSetting = getReq.result[key];
        var newSetting = null;
        if (!originalSetting) {
          newSetting = ['', ''];
        } else if (!Array.isArray(originalSetting)) {
          // Migrate settings field if needed
          newSetting = [originalSetting, ''];
        }

        if (newSetting) {
          var obj = {};
          obj[key] = newSetting;
          var setReq = _settings.createLock().set(obj);
          setReq.onsuccess = resolve;
          setReq.onerror = resolve;
        } else {
          resolve();
        }
      };
      getReq.onerror = resolve;
    });
  }

  return {
    ov_ensureValueUnderKeyIsArray: ov_ensureValueUnderKeyIsArray,
    init: function() {
      Promise.all([
        ov_ensureValueUnderKeyIsArray('ril.iccInfo.mbdn'),
        ov_ensureValueUnderKeyIsArray('ril.cellbroadcast.disabled'),
        ov_ensureValueUnderKeyIsArray('ril.cellbroadcast.searchlist')
      ]).then(function() {
        ov_init();
      });
    }
  };
})();

OperatorVariant.init();
