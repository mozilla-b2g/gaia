/* global AirplaneMode, BaseModule, LazyLoader, AirplaneModeIcon */
/* exported AirplaneMode */
'use strict';

(function() {
  // main
  var AirplaneMode = function() {
  };
  AirplaneMode.SETTINGS = [
    'airplaneMode.enabled'
  ];
  AirplaneMode.EVENTS = [
    'radiostatechange',
    'request-airplane-mode-enable',
    'request-airplane-mode-disable'
  ];
  AirplaneMode.SUB_MODULES = [
    'AirplaneModeServiceHelper'
  ];
  AirplaneMode.SERVICES = [
    'registerNetwork',
    'unregisterNetwork'
  ];
  AirplaneMode.STATES = [
    'isActive'
  ];
  BaseModule.create(AirplaneMode, {
    name: 'AirplaneMode',

    isActive: function() {
      return this._enabled;
    },

    /*
     * This is an internal key to store current state of AirplaneMode
     */
    _enabled: undefined,

    /*
     * This is an event mapping table that will help us wait for
     * specific event from its manager to make sure we are now
     * in airplane mode or not.
     */
    _checkedActionsMap: {
      wifi: {
        enabled: 'wifi-enabled',
        disabled: 'wifi-disabled'
      },
      bluetooth: {
        enabled: 'bluetooth-enabled',
        disabled: 'bluetooth-disabled'
      },
      radio: {
        enabled: 'radio-enabled',
        disabled: 'radio-disabled'
      }
    },

    '_observe_airplaneMode.enabled': function(value) {
      this.enabled = value;
    },

    /*
     * If we are in airplane mode and the user just dial out an
     * emergency call, we have to exit airplane mode.
     */
    _handle_radiostatechange: function(evt) {
      if (evt.detail.state === 'enabled' && this._enabled === true) {
        this.enabled = false;
      }
    },

    '_handle_request-airplane-mode-enable': function() {
      if (this.enabled === false) {
        this.enabled = true;
      }
    },

    '_handle_request-airplane-mode-disable': function() {
      if (this.enabled === true) {
        this.enabled = false;
      }
    },

    _start: function() {
      this._watchList = {};
      LazyLoader.load(['js/airplane_mode_icon.js']).then(function() {
        this.icon = new AirplaneModeIcon(this);
        this.icon.start();
      }.bind(this))['catch'](function(err) { // XXX: workaround gjslint
        console.error(err);
      });
    },

    _stop: function() {
      this._watchList = {};
    },

    /*
     * When turning on / off airplane mode, we will start watching
     * needed events to make sure we are in airplane mode or not.
     *
     * @param {boolean} value
     * @param {Object} checkedActions
     */
    watchEvents: function(value, checkedActions) {
      var self = this;
      // We don't want to wait until the first event reacts in order to
      // update the status, because we can set the status to 'enabling' or
      // 'disabling' already through `_updateAirplaneModeStatus`.
      this._updateAirplaneModeStatus(checkedActions);

      function updateAirplaneModeHandler(eventName, serviceName) {
        return function toUpdateAirplaneMode() {
          self.debug('handling ' + eventName);
          window.removeEventListener(eventName, toUpdateAirplaneMode);
          checkedActions[serviceName] = true;
          self._updateAirplaneModeStatus(checkedActions);
        };
      }

      for (var serviceName in this._checkedActionsMap) {
        // if we are waiting for specific service
        if (serviceName in checkedActions) {
          var action = value ? 'disabled' : 'enabled';
          var eventName = this._checkedActionsMap[serviceName][action];

          // then we will start watch events coming from its manager
          window.addEventListener(eventName,
            updateAirplaneModeHandler(eventName, serviceName));
        }
      }
    },

    /*
     * In order to make sure all needed managers work successfully. We have to
     * use this method to update airplaneMode related keys to tell
     * AirplaneModeHelper our current states and is finised or not.
     */
    _updateAirplaneModeStatus: function(checkActions) {
      var areAllActionsDone;

      areAllActionsDone = this._areCheckedActionsAllDone(checkActions);

      if (areAllActionsDone) {
        this.debug('write settings...', this._enabled);
        this.writeSetting({
          'airplaneMode.enabled': this._enabled,
          'airplaneMode.status': this._enabled ? 'enabled' : 'disabled',
          // NOTE
          // this is for backward compatibility,
          // because we will update this value only when airplane mode
          // is on / off, it will not affect apps using this value
          'ril.radio.disabled': this._enabled
        });
        this.icon && this.icon.update();
      } else {
        // keep updating the status to reflect current status
        this.writeSetting({
          'airplaneMode.status': this._enabled ? 'enabling' : 'disabling'
        });
      }
    },

    registerNetwork: function(network, handler) {
      if (this._watchList[network]) {
        return;
      }
      this._watchList[network] = handler;
      this.debug(network + ' is registered.');
    },

    unregisterNetwork: function(network) {
      if (!this._watchList[network]) {
        return;
      }
      delete this._watchList[network];
      this.debug(network + ' is unregistered.');
    },

    /*
     * By default, these three API takes longer time and with success / error
     * callback. we just have to wait for these three items.
     *
     * @param {boolean} value
     * @return {Object} checkedActions
     */
    _getCheckedActions: function(value) {
      // we have to re-init all need-to-check managers
      var checkedActions = {};

      if (value === true) {
        // check connection
        if (this._watchList.radio && this._watchList.radio.enabled) {
          checkedActions.radio = false;
        }

        // check bluetooth
        if (this.airplaneModeServiceHelper.isEnabled('bluetooth')) {
          checkedActions.bluetooth = false;
        }

        // check wifi
        if (this.airplaneModeServiceHelper.isEnabled('wifi')) {
          checkedActions.wifi = false;
        }
      } else {
        // check connection
        if (this._watchList.radio && !this._watchList.radio.enabled) {
          checkedActions.radio = false;
        }

        // check bluetooth
        if (this.airplaneModeServiceHelper.isSuspended('bluetooth')) {
          checkedActions.bluetooth = false;
        }

        // check wifi
        if (this.airplaneModeServiceHelper.isSuspended('wifi')) {
          checkedActions.wifi = false;
        }
      }

      return checkedActions;
    },

    /*
     * We have to use this method to check whether all actions
     * are done or not.
     *
     * @return {boolean}
     */
    _areCheckedActionsAllDone: function(checkedActions) {
      this.debug('checking action is all done ?');
      for (var key in checkedActions) {
        if (checkedActions[key] === false) {
          this.debug(key + '...not yet.');
          return false;
        }
      }
      this.debug('...all done');
      return true;
    }
  }, {
    enabled: {
      configurable: false,
      /*
       * This is a ES5 feature that can help the others easily get/set
       * AirplaneMode.
       *
       * @param {boolean} value
       */
      set: function(value) {
        this.debug('current: ' + this._enabled);
        if (value !== this._enabled) {
          this.debug('turned to ' + value);
          this._enabled = value;

          // start watching events
          this.watchEvents(value, this._getCheckedActions(value));

          // tell services to do their own operations
          this.airplaneModeServiceHelper.updateStatus(value);
        }
      },

      /*
       * This is a ES5 feature that can help the others easily get AirplaneMode
       * states.
       *
       * @return {boolean}
       */
      get: function() {
        return this._enabled;
      }
    }
  });
})();
