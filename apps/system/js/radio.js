/* global BaseModule */

'use strict';

(function() {
  var Radio = function(core) {
    /*
     * An internal key used to make sure Radio is
     * enabled or not.
     *
     * @default {Boolean} null
     */
    this._enabled = null;

    /*
     * An internal key used to track how may operations have
     * been executed on radio.
     *
     * @default {Number} 0
     */
    this._setRadioOpCount = 0;

    /*
     * An internal array storing the expecting radio states.
     *
     * @default {Boolean} false
     */
    this._expectedRadioStates = [];

    /*
     * An internal key used to track whether there is any error
     * happened when calling setRadioEnabled
     *
     * @default {Boolean} false
     */
    this._isSetRadioOpError = false;

    /*
     * An internal variable to cache mozMobileConnections
     */
    this._mobileConnections = core.mobileConnections || null;
  };

  Radio.EVENTS = [
    'airplanemode-enabled',
    'airplanemode-disabled'
  ];

  BaseModule.create(Radio, {
    name: 'Radio',
    EVENT_PREFIX: 'radio',

    '_handle_airplanemode-enabled': function() {
      this.enabled = false;
    },

    '_handle_airplanemode-disabled': function() {
      this.enabled = true;
    },

    /*
     * Checks if the state change is expected. If not, we should re-enable the
     * radio when necessary.
     */
    _onRadioStateChange: function(conn, index) {
      this.debug('radiostatechange: [' + index + '] ' + conn.radioState);
      if (this._expectedRadioStates[index] !== null) {
        // we are expecting radio state changes
        if (this._expectedRadioStates[index] &&
            conn.radioState === 'enabled' ||
            !this._expectedRadioStates[index] &&
            conn.radioState === 'disabled') {
          // clear the expected state if the real state meets the expection.
          this._expectedRadioStates[index] = null;
        }
      } else {
        // there is an unexpected radio state change from gecko
        this._reEnableRadioIfNeeded(conn, index);
      }
      this.publish('statechange', {
        index: index,
        state: conn.radioState
      });
    },

    /*
     * An internal function used to make sure current radioState
     * is ok to do following operations.
     */
    _start: function() {
      this.mobileConnections.forEach(function(conn, index) {
        this._expectedRadioStates.push(null);
        conn.addEventListener('radiostatechange',
          this._onRadioStateChange.bind(this, conn, index));
      }, this);
      this.service.request('AirplaneMode:registerNetwork', 'radio', this);
      var airplaneMode = this.service.query('AirplaneMode.isActive');
      if (undefined !== airplaneMode) {
        this.enabled = !airplaneMode;
      }
    },

    _stop: function() {
      this.service.request('AirplaneMode:unregisterNetwork', 'radio', this);
    },

    /*
     * An internal function used to make sure current radioState
     * is ok to do following operations.
     *
     * @param {MozMobileConnection} conn
     * @param {Boolean} enabled
     */
    _setRadioEnabled: function(conn, enabled, index) {
      this.debug(conn.radioState + ' ======> ' + enabled);
      if (conn.radioState !== 'enabling' &&
          conn.radioState !== 'disabling' &&
          conn.radioState !== null) {
        this._doSetRadioEnabled(conn, enabled, index);
      } else {
        var radioStateChangeHandler = (function onchange() {
          if (conn.radioState == 'enabling' ||
              conn.radioState == 'disabling' ||
              conn.radioState == null) {
            return;
          }
          conn.removeEventListener('radiostatechange',
            radioStateChangeHandler);
          this._doSetRadioEnabled(conn, enabled, index);
        }).bind(this);
        conn.addEventListener('radiostatechange', radioStateChangeHandler);
      }
    },

    /*
     * An internal function to tell Gecko setRadioEnabled
     *
     * @param {MozMobileConnection} conn
     * @param {Boolean} enabled
     */
    _doSetRadioEnabled: function(conn, enabled, index) {
      // Set the expected state so that we can tell whether a radio change
      // results from gaia or gecko.
      this._expectedRadioStates[index] = enabled;
      this.debug('Real operation to turn ' + (enabled ? 'on' : 'off') +
        ' for ' + index + ' connection.');
      var self = this;
      (function() {
        var req = conn.setRadioEnabled(enabled);

        req.onsuccess = function() {
          self._setRadioOpCount++;
          self._setRadioAfterReqsCalled(enabled);
        };

        req.onerror = function() {
          self.debug('toggle connection ' + index + ' error.');
          self._isSetRadioOpError = true;
          self._setRadioOpCount++;
          self._setRadioAfterReqsCalled(enabled);
        };
      }());
    },

    /*
     * We have to make sure all mobileConnections work
     * as what we have expected and dispatch event to
     * tell AirplaneMode that Radio operations are done.
     *
     * @param {Boolean} enabled
     */
    _setRadioAfterReqsCalled: function(enabled) {
      if (this._isSetRadioOpError) {
        throw new Error('We got error when disabling radio');
      }

      if (this._setRadioOpCount !== this.mobileConnections.length) {
        this.debug('operation not completed yet.', this._setRadioOpCount);
        return;
      } else {
        this._enabled = enabled;
        var evtName = enabled ?
          '-enabled' : '-disabled';

        this.publish(evtName);
      }
    },

    _reEnableRadioIfNeeded: function(conn) {
      if (conn.radioState === 'disabled' && this.enabled) {
        this._setRadioEnabled(conn, true);
      }
    }
  }, {
    /*
     * We can use this value to know Radio is enabled or not
     *
     * @return {Boolean}
     */
    enabled: {
      congfigurable: false,
      get: function() {
        return this._enabled;
      },
      /*
       * We can set this value to tell Radio service turn on / off
       * radio.
       *
       * @param {Boolean} value
       */
      set: function(value) {
        this.debug(this._enabled + ' => ' + value);
        if (value !== this._enabled) {
          this._setRadioOpCount = 0;
          this._isSetRadioOpError = false;

          this.mobileConnections.forEach(function(conn, index) {
            this._setRadioEnabled(conn, value, index);
          }, this);
        }
      }
    },

    /*
     * An internal helper to make mobileConnections iterable
     */
    mobileConnections: {
      congfigurable: false,
      get: function() {
        if (!this._mozMobileConnections) {
          this._mozMobileConnections =
            Array.prototype.slice.call(this._mobileConnections);
        }
        return this._mozMobileConnections;
      }
    }
  });
})();
