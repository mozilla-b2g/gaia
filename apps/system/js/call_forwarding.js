/* global BaseModule, asyncStorage, SIMSlotManager, SettingsHelper,
          CallForwardingsIcon, LazyLoader */
'use strict';

(function() {
  // Must be in sync with nsIDOMMozMobileCFInfo interface.
  var _cfReason = {
    CALL_FORWARD_REASON_UNCONDITIONAL: 0,
    CALL_FORWARD_REASON_MOBILE_BUSY: 1,
    CALL_FORWARD_REASON_NO_REPLY: 2,
    CALL_FORWARD_REASON_NOT_REACHABLE: 3,
    CALL_FORWARD_REASON_ALL_CALL_FORWARDING: 4,
    CALL_FORWARD_REASON_ALL_CONDITIONAL_CALL_FORWARDING: 5
  };
  var _cfAction = {
    CALL_FORWARD_ACTION_DISABLE: 0,
    CALL_FORWARD_ACTION_ENABLE: 1,
    CALL_FORWARD_ACTION_QUERY_STATUS: 2,
    CALL_FORWARD_ACTION_REGISTRATION: 3,
    CALL_FORWARD_ACTION_ERASURE: 4
  };

  /**
   * The module initializes the call forwarding icon states and update the icons
   * when call forwarding states changed.
   * As we are not able to query the current call forwarding states from the
   * carrier on startup, we initialized the icon state based on the cached
   * information. When call forwarding states are changed, the module caches
   * the state along with the corresponding iccId.
   * @class CallForwarding
   * @requires SIMSlotManager
   * @requires SettingsHelper
   */
  function CallForwarding() {
    this._slots = null;
    this._callForwardingHelper = null;
    this._defaultCallForwardingIconStates = null;
    this._callForwardingIconInitializedStates = null;
  }
  CallForwarding.STATES = [
    'enabled'
  ];
  CallForwarding.SETTINGS = [
    'ril.cf.enabled'
  ];

  BaseModule.create(CallForwarding, {
    name: 'CallForwarding',

    /**
     * Add related event handlers. The sim cards may not be ready when starting.
     * We register to "simslot-cardstatechange" and "simslot-iccinfochange" for
     * updating the icons when ready. When users query the current call
     * forwarding states in settings app, 'ril.cf.carrier.enabled' is used to
     * notify the state changes. When users change the call forwarding states in
     * settings app, we will receive the 'cfstatechange' event. All the events
     * must be watched to have correct icon states.
     * @memberof CallForwarding.prototype
     */
    _addEventHandlers: function() {
      window.addEventListener('simslot-cardstatechange', (function(event) {
        this._initCallForwardingState(event.detail);
      }).bind(this));
      window.addEventListener('simslot-iccinfochange', (function(event) {
        this._initCallForwardingState(event.detail);
      }).bind(this));

      // Get notified when users query the latest call forwarding states in
      // settings app
      navigator.mozSettings.addObserver('ril.cf.carrier.enabled',
        (function(event) {
          var detail = event.settingValue;
          if (detail) {
            this._onCallForwardingStateChanged(detail.index, detail.enabled);
          }
      }).bind(this));

      this._slots.forEach(function(slot) {
        var conn = slot.conn;
        conn.addEventListener('cfstatechange',
          this._updateCallForwardingIconState.bind(this, slot));
      }, this);
    },

    /**
     * Initialize the icon states based on iccId and cached information.
     * @param {SIMSlot} slot The target sim slot.
     * @memberof CallForwarding.prototype
     */
    _initCallForwardingState: function(slot) {
      var index = slot.index;
      var simCard = slot.simCard;

      if (this._callForwardingIconInitializedStates[index]) {
        return;
      }

      var that = this;
      var cardState = simCard && simCard.cardState;
      var iccid = simCard && simCard.iccInfo && simCard.iccInfo.iccid;
      // Disable call forwarding icon and early return when:
      // 1. sim card not present, or
      // 2. sim card state is not ready, or
      // 3. sim card iccId is not available.
      if (!simCard || cardState !== 'ready' || !iccid) {
        that._callForwardingHelper.get(function(states) {
          states[index] = false;
          that._callForwardingHelper.set(states);
        });
        return;
      }

      asyncStorage.getItem('ril.cf.enabled.' + iccid, function(value) {
        if (value === null) {
          value = false;
        }
        that._callForwardingHelper.get(function(states) {
          states[index] = value;
          that._callForwardingHelper.set(states, function() {
            that._callForwardingIconInitializedStates[index] = true;
          });
        });
      });
    },

    /**
     * Gets called when receiving "cfstatechange". It updates the cached
     * information and icon states.
     * @param {SIMSlot} slot The target sim slot.
     * @param {Event} event The event.
     * @memberof CallForwarding.prototype
     */
    _updateCallForwardingIconState: function(slot, event) {
      if (!event ||
          (event.reason != _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL &&
           event.reason != _cfReason.CALL_FORWARD_REASON_ALL_CALL_FORWARDING)) {
        return;
      }

      var index = slot.index;
      var simCard = slot.simCard;

      var enabled = false;
      switch (event.action) {
        case _cfAction.CALL_FORWARD_ACTION_REGISTRATION:
        case _cfAction.CALL_FORWARD_ACTION_ENABLE:
          enabled = true;
          break;
        case _cfAction.CALL_FORWARD_ACTION_ERASURE:
          enabled = false;
          break;
        default:
          enabled = false;
          break;
      }

      this._callForwardingHelper.get((function(states) {
        states[index] = enabled;
        this._callForwardingHelper.set(states);
      }).bind(this));

      if (!simCard) {
        return;
      }
      var iccid = simCard.iccInfo && simCard.iccInfo.iccid;
      asyncStorage.setItem('ril.cf.enabled.' + iccid, enabled);
    },

    /**
     * Gets called when 'ril.cf.carrier.enabled' changes. It updates the cached
     * information and icon states.
     * @param {Number} index The index of the sim card being changed.
     * @param {Boolean} enabled The call forwarding state.
     * @memberof CallForwarding.prototype
     */
    _onCallForwardingStateChanged: function(index, enabled) {
      this._callForwardingHelper.get((function(states) {
        states[index] = enabled;
        this._callForwardingHelper.set(states);
      }).bind(this));

      var simCard = this._slots[index].simCard;
      if (!simCard) {
        return;
      }
      var iccid = simCard.iccInfo && simCard.iccInfo.iccid;
      asyncStorage.setItem('ril.cf.enabled.' + iccid, enabled);
    },

    enabled: function(index) {
      return this._enabled[index];
    },

    /**
     * Start the module.
     * @memberof CallForwarding.prototype
     */
    _start: function() {
      this._slots = SIMSlotManager.getSlots();
      this._enabled = [];
      this._defaultCallForwardingIconStates =
        Array.prototype.map.call(this._slots, function() { return false; });
      this._callForwardingIconInitializedStates =
        Array.prototype.map.call(this._slots, function() { return false; });

      // XXX:
      // We should use observe/read/write functionality in baseModule
      // and remove the usage here.
      LazyLoader.load(['shared/js/settings_helper.js']).then(() => {
        this._callForwardingHelper =
          SettingsHelper('ril.cf.enabled',
            this._defaultCallForwardingIconStates);

        this._addEventHandlers();

        // Initialize the icon states
        this._slots.forEach(function(slot) {
          this._initCallForwardingState(slot);
        }, this);
      }).catch((err) => {
        console.error(err);
      });
    },

    '_observe_ril.cf.enabled': function(value) {
      this._enabled = value || [];
      var isAnyEnabled =
        this._enabled.some(function(enabled) { return enabled; });
      if (!this.icon && isAnyEnabled) {
        LazyLoader.load(['js/call_forwarding_icon.js']).then(function() {
          this.icon = new CallForwardingsIcon(this);
          this.icon.start();
        }.bind(this)).catch(function(err) {
          console.error(err);
        });
      }
      this.icon && this.icon.update();
    }
  });
})();
