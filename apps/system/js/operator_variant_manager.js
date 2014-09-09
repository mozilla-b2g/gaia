/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global OperatorVariant, System, Promise */

'use strict';

/**
 * Singleton object that helps to set some carrier-specific settings on boot.
 * Detects the ICC cards on boot and creates objects in charge of setting
 * some operator-specific settings relying on the ICC card.
 */
(function(exports) {
  var _settings = window.navigator.mozSettings;
  var _iccManager = window.navigator.mozIccManager;
  var OperatorVariantManager = function(core) {
    this.mobileConnections = core.mobileConnections;
    this.operatorVariants = [];
  };
  OperatorVariantManager.IMPORTS = [
    'shared/js/apn_helper.js',
    'shared/js/operator_variant_helper.js',
    'js/operator_variant.js'
  ];

  System.create(OperatorVariantManager, {}, {
    name: 'OperatorVariantManager',
    _start: function() {
      Promise.all([
        this.ensureValueUnderKeyIsArray('ril.iccInfo.mbdn'),
        this.ensureValueUnderKeyIsArray('ril.cellbroadcast.disabled'),
        this.ensureValueUnderKeyIsArray('ril.cellbroadcast.searchlist')
      ]).then(function() {
        this.init();
      }.bind(this));
    },

    /**
     * Handle some carrier-specific settings on the ICC card whose id
     * we pass as parameter.
     *
     * @param {String} iccId The iccId code form the ICC card.
     * @param {Numeric} iccCardIndex Index of the ICC card on the
     *                               mobileConnections array.
     *
     * @return {Object} A OperatorVariant object.
     */
    handleICCCard: function(iccId, iccCardIndex) {
      var obj = new OperatorVariant(iccId, iccCardIndex);
      obj.init();

      return obj;
    },

    init: function() {
      if (!this.mobileConnections || !_iccManager || !_settings) {
        return;
      }
      var numberOfICCCards = this.mobileConnections.length;
      for (var i = 0; i < numberOfICCCards; i++) {
        var mobileConnection = this.mobileConnections[i];
        if (!mobileConnection.iccId) {
          this.operatorVariants[i] = null;
          continue;
        }
        var iccCardIndex = this.getIccCardIndex(mobileConnection.iccId);
        this.operatorVariants[i] =
          this.handleICCCard(mobileConnection.iccId,
                                               iccCardIndex);
      }

      _iccManager.addEventListener('iccdetected',
        function iccDetectedHandler(evt) {
          var iccId = evt.iccId;
          var iccCardIndex = this.getIccCardIndex(iccId);
          this.operatorVariants[iccCardIndex] =
            this.handleICCCard(iccId, iccCardIndex);
      }.bind(this));
    },

    /**
     * Helper function.
     * Return the index of the ICC card given the ICC code in the
     * ICC card.
     *
     * @param {String} iccId The iccId code form the ICC card.
     *
     * @return {Numeric} The index.
     */
    getIccCardIndex: function(iccId) {
      for (var i = 0; i < this.mobileConnections.length; i++) {
        if (this.mobileConnections[i].iccId === iccId) {
          return i;
        }
      }
      return -1;
    },

    /**
     * Helper function. Ensure the value stored under the specified key is an
     * array.
     */
    ensureValueUnderKeyIsArray: function(key) {
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
  });

  exports.OperatorVariantManager = OperatorVariantManager;
})(window);
