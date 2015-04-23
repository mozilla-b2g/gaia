/**
 * AutoSelectionModel is responsible for toggling operator auto selection. If
 * the mobile connection is busy, it caches the request and do it later once
 * the mobile connection becomes available.
 *
 * @module panels/operator_settings/models/auto_selection_model
 */
define(function(require) {
  'use strict';

  var Defer = require('modules/defer');
  var StateModel = require('modules/state_model');
  var MobileConnectionWrapper =
    require('panels/operator_settings/models/mobile_connection_wrapper');

  // Auto selection state
  const AS_STATE = {
    UNKNOWN: 0,
    ENABLED: 1,
    DISABLED: 2
  };

  const AS_STATE_MAP = {
    'manual': AS_STATE.DISABLED,
    'automatic': AS_STATE.ENABLED
  };

  var AutoSelectionModel = function(connWrapper) {
    return StateModel({
      onInit: function() {
        this._pendingRequest = null;
        connWrapper.observe('state', (newState) => {
          this._checkPendingRequest(newState);
        });
        return AS_STATE_MAP[connWrapper.networkSelectionMode] ||
          AS_STATE.UNKNOWN;
      },
      onGetState: function() {
        return Promise.resolve(AS_STATE_MAP[connWrapper.networkSelectionMode] ||
          AS_STATE.UNKNOWN);
      },
      onSetState: function(state) {
        switch (connWrapper.state) {
          case MobileConnectionWrapper.STATE.IDLE:
            if (state === AS_STATE.ENABLED) {
              return connWrapper.setAutoSelection().then(() => {
                return AS_STATE.ENABLED;
              }, () => {
                return Promise.reject(
                  AS_STATE_MAP[connWrapper.networkSelectionMode]);
              });
            } else {
              return Promise.resolve(AS_STATE.DISABLED);
            }
            break;
          case MobileConnectionWrapper.STATE.BUSY:
            return this._getPendingRequest(state).promise;
        }
      },
      _getPendingRequest: function(state) {
        if (!this._pendingRequest) {
          this._pendingRequest = Defer();
        }
        this._pendingRequest.state = state;
        return this._pendingRequest;
      },
      _checkPendingRequest: function(newState) {
        var pendingRequest = this._pendingRequest;
        if (newState !== MobileConnectionWrapper.STATE.IDLE ||
          pendingRequest === null) {
          return;
        }

        this._pendingRequest = null;
        switch (pendingRequest.state) {
          case AS_STATE.ENABLED:
            connWrapper.setAutoSelection().then(() => {
              pendingRequest.resolve(AS_STATE.ENABLED);
            }, () => {
              pendingRequest.reject(
                AS_STATE_MAP[connWrapper.networkSelectionMode]);
            });
            break;
          case AS_STATE.DISABLED:
            pendingRequest.resolve(AS_STATE.DISABLED);
            break;
        }
      }
    });
  };

  /**
   * A static property. The enumeration of the possible states.
   *
   * @access public
   * @memberOf AutoSelectionModel
   * @type {Object}
   */
  Object.defineProperty(AutoSelectionModel, 'STATE', {
    get: function() {
      return AS_STATE;
    }
  });

  return AutoSelectionModel;
});
