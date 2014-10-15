/**
 * SimSecurityItem is manily used in Single Sim device because this would
 * be integrated into Sim Manager > Sim Security in DSDS devices.
 *
 * @module SimSecurityItem
 */
define(function(require) {
  'use strict';

  var SIMSlotManager = require('shared/simslot_manager');
  var AirplaneModeHelper = require('shared/airplane_mode_helper');

  function SimSecurityItem(element) {
    this._element = element;
    this._itemEnabled = false;
    this._activeSlot = this._getActiveSlot();
    this._boundUpdateUI = this._updateUI.bind(this);
  }

  SimSecurityItem.prototype = {
    /**
     * Set the current status of SimSecurityItem
     *
     * @access public
     * @param {Boolean} enabled
     * @memberOf SimSecurityItem
     */
    set enabled(enabled) {
      // 1. SimSecurityItem only shows up on Single SIM devices
      // 2. If there is no activeSlot, it means we don't have to do anything
      // 3. If internal variable is enabled and we still want to enable,
      // we don't have to do anything and vice versa.
      if (SIMSlotManager.isMultiSIM() ||
        !this._activeSlot || enabled === this._itemEnabled) {
          return;
      }

      this._itemEnabled = enabled;
      if (this._itemEnabled) {
        this._boundUpdateUI();
        this._activeSlot.conn.addEventListener('cardstatechange',
          this._boundUpdateUI);
        AirplaneModeHelper.addEventListener('statechange',
          this._boundUpdateUI);
      } else {
        this._activeSlot.conn.removeEventListener('cardstatechange',
          this._boundUpdateUI);
        AirplaneModeHelper.removeEventListener('statechange',
          this._boundUpdateUI);
      }
    },

    /**
     * Get the current status of SimSecurityItem
     *
     * @access public
     * @memberOf SimSecurityItem
     */
    get enabled() {
      return this._itemEnabled;
    },

    /**
     * This method is used to update UI based on statuses of SIM / APM
     *
     * @access private
     * @memberOf SimSecurityItem
     */
    _updateUI: function() {
      var self = this;
      AirplaneModeHelper.ready(function() {
        // if disabled
        self._element.style.fontStyle = 'italic';

        // if APM is enabled
        var airplaneModeStatus = AirplaneModeHelper.getStatus();
        if (airplaneModeStatus === 'enabled') {
          self._element.setAttribute('data-l10n-id', 'simCardNotReady');
          return;
        }

        var cardState = self._activeSlot.simCard.cardState;
        switch(cardState) {
          case null:
            self._element.setAttribute('data-l10n-id', 'noSimCard');
            return;
          case 'unknown':
            self._element.setAttribute('data-l10n-id', 'unknownSimCardState');
            return;
        }

        // enabled instead
        self._element.style.fontStyle = 'normal';

        // with SIM card, query its status
        var icc = self._activeSlot.simCard;
        var req = icc.getCardLock('pin');
        req.onsuccess = function spl_checkSuccess() {
          var enabled = req.result.enabled;
          self._element.setAttribute('data-l10n-id',
            enabled ? 'enabled' : 'disabled');
        };
      });
    },

    /**
     * We use this to get active Sim slot.
     *
     * @access private
     * @memberOf SimSecurityItem
     */
    _getActiveSlot: function() {
      var activeSlot;
      SIMSlotManager.getSlots().forEach(function(SIMSlot) {
        if (!SIMSlot.isAbsent()) {
          activeSlot = SIMSlot;
        }
      });
      return activeSlot;
    }
  };

  return function ctor_sim_security_item(element) {
    return new SimSecurityItem(element);
  };
});
