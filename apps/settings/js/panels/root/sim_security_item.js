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
  var SimSecurity = require('modules/sim_security');

  function SimSecurityItem(element) {
    this._element = element;
    this._itemEnabled = false;
    this._cardIndex = 0;
    this._activeSlot = this._getActiveSlot();
    this._boundUpdateUI = this._updateUI.bind(this);

    // Note
    // Because we can't rely on Gecko's oncardstatechange, we have to
    // update UI based on our customized events.
    SimSecurity.addEventListener('pin-enabled', () => {
      this._boundUpdateUI();
    });

    SimSecurity.addEventListener('pin-disabled', () => {
      this._boundUpdateUI();
    });
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
        AirplaneModeHelper.addEventListener('statechange',
          this._boundUpdateUI);
      } else {
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
      var promise = new Promise((resolve) => {
        AirplaneModeHelper.ready(() => {
          // if disabled
          this._element.style.fontStyle = 'italic';

          // if APM is enabled
          var airplaneModeStatus = AirplaneModeHelper.getStatus();
          if (airplaneModeStatus === 'enabled') {
            this._element.setAttribute('data-l10n-id', 'simCardNotReady');
            return resolve();
          }

          var cardState = this._activeSlot.simCard.cardState;
          switch(cardState) {
            case null:
              this._element.setAttribute('data-l10n-id', 'noSimCard');
              return resolve();
            case 'unknown':
              this._element.setAttribute('data-l10n-id', 'unknownSimCardState');
              return resolve();
          }

          // enabled instead
          this._element.style.fontStyle = 'normal';

          SimSecurity.getCardLock(this._cardIndex, 'pin').then((result) => {
            var enabled = result.enabled;
            this._element.setAttribute('data-l10n-id',
              enabled ? 'enabled' : 'disabled');
            return resolve();
          });
        });
      });

      return promise;
    },

    /**
     * We use this to get active Sim slot.
     *
     * @access private
     * @memberOf SimSecurityItem
     */
    _getActiveSlot: function() {
      var slot = SIMSlotManager.get(this._cardIndex);
      if (slot && !slot.isAbsent()) {
        return slot;
      }
    }
  };

  return function ctor_sim_security_item(element) {
    return new SimSecurityItem(element);
  };
});
