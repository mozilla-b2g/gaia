/* global BaseModule, OperatorVariantHandler, SIMSlotManager */
'use strict';

/**
 * Singleton object that helps to set some carrier-specific settings on boot.
 * Detects the ICC cards on boot and creates objects in charge of setting
 * some operator-specific settings relying on the ICC card.
 */
(function() {
  var OperatorVariantManager = function(core) {
    /** Array of OperatorVariantHandler objects. */
    this.operatorVariantHandlers = [];
  };
  OperatorVariantManager.EVENTS = [
    'simslotupdated'
  ];
  BaseModule.create(OperatorVariantManager, {
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

    _stop: function() {
      this._operatorVariantHandlers = [];
    },

    _handle_simslotupdated: function(evt) {
      var simslot = evt.detail;
      this.operatorVariantHandlers[simslot.index] =
        new OperatorVariantHandler(simslot.simCard, simslot.index);
      this.operatorVariantHandlers[simslot.index].start();
    },

    init: function() {
      SIMSlotManager.getSlots().forEach(function(slot, index) {
        if (!slot.simCard) {
          this.operatorVariantHandlers[index] = null;
          return;
        }
        this.operatorVariantHandlers[index] =
          new OperatorVariantHandler(slot.simCard,
                                     slot.index);
        this.operatorVariantHandlers[index].start();
      }, this);
    },

    /**
     * Helper function. Ensure the value stored under the specified key is an
     * array.
     */
    ensureValueUnderKeyIsArray: function(key) {
      return new Promise(function(resolve, reject) {
        this.readSetting(key).then(function(value) {
          var originalSetting = value;
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
            this.writeSetting(obj).then(function() {
              resolve();
            }, function() {
              resolve();
            });
          } else {
            resolve();
          }
        }.bind(this), function() {
          resolve();
        }.bind(this));
      }.bind(this));
    }
  });
})();
