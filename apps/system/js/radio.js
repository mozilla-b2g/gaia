/* exported Radio */
/* global BaseModule */

'use strict';

(function() {
  var Radio = function(mobileConnections) {
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
    this._mobileConnections = mobileConnections || null;
  };

  BaseModule.create(Radio, {
    name: 'Radio',

    /*
     * We can addEventListener on conn with this helper.
     * This is used only when one mobileConnection got enabled
     * by Gecko when Emergency call happened.
     *
     * In order not to bind this on multiple connecitnos, we
     * only bind on the first one with simcard inserted
     *
     * @param {String} key
     * @param {Function} callback
     */
    addEventListener: function(key, callback) {
      if (key === 'radiostatechange') {
        this.mobileConnections.forEach(function(conn, index) {
          conn.addEventListener(key, function() {
            var connState = conn.radioState;
            callback(connState);
          });
        });
      }
    },

    /*
     * Checks if the state change is expected. If not, we should re-enable the
     * radio when necessary.
     */
    _onRadioStateChange: function(conn, index) {
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
    },

    /*
     * An internal function used to make sure current radioState
     * is ok to do following operations.
     *
     * @param {MozMobileConnection} conn
     * @param {Boolean} enabled
     */
    _setRadioEnabled: function(conn, enabled) {
      this.debug('Conn state: ' + conn.radioState);
      if (conn.radioState !== 'enabling' &&
          conn.radioState !== 'disabling' &&
          conn.radioState !== null) {
        this._doSetRadioEnabled(conn, enabled);
      } else {
        var radioStateChangeHandler = (function onchange() {
          if (conn.radioState == 'enabling' ||
              conn.radioState == 'disabling' ||
              conn.radioState == null) {
            return;
          }
          conn.removeEventListener('radiostatechange',
            radioStateChangeHandler);
          this._doSetRadioEnabled(conn, enabled);
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
    _doSetRadioEnabled: function(conn, enabled) {
      // Set the expected state so that we can tell whether a radio change
      // results from gaia or gecko.
      this._expectedRadioStates[this.mobileConnections.indexOf(conn)] = enabled;
      this.debug('real operation to toggle radio', enabled, conn);
      var self = this;
      var req = conn.setRadioEnabled(enabled);

      req.onsuccess = function() {
        self._setRadioOpCount++;
        self._setRadioAfterReqsCalled(enabled);
      };

      req.onerror = function() {
        self._isSetRadioOpError = true;
        self._setRadioOpCount++;
        self._setRadioAfterReqsCalled(enabled);
      };
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
        return;
      } else {
        this._enabled = enabled;
        var evtName = enabled ?
          'radio-enabled' : 'radio-disabled';

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
            this._setRadioEnabled(conn, value);
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
