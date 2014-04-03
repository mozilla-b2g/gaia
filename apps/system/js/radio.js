/* exported Radio */
/* global CustomEvent */

'use strict';

(function(exports) {

  if (!window.navigator.mozMobileConnections) {
    return;
  }

  var Radio = function() {
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
     * An internal key used to track whether there is any error
     * happened when calling setRadioEnabled
     *
     * @default {Boolean} false
     */
    this._isSetRadioOpError = false;

    /*
     * An internal variable to cache mozMobileConnections
     */
    this._mozMobileConnections = null;
  };

  Radio.prototype = {

    /*
     * We can use this value to know Radio is enabled or not
     *
     * @return {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    /*
     * An internal helper to make mobileConnections iterable
     */
    get mobileConnections() {
      if (!this._mozMobileConnections) {
        this._mozMobileConnections =
          Array.prototype.slice.call(window.navigator.mozMobileConnections);
      }
      return this._mozMobileConnections;
    },

    /*
     * We can set this value to tell Radio service turn on / off
     * radio.
     *
     * @param {Boolean} value
     */
    set enabled(value) {
      if (value !== this._enabled) {
        this._setRadioOpCount = 0;
        this._isSetRadioOpError = false;

        this.mobileConnections.forEach(function(conn, index) {
          this._setRadioEnabled(conn, value);
        }, this);
      }
    },

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
     * An internal function used to make sure current radioState
     * is ok to do following operations.
     *
     * @param {MozMobileConnection} conn
     * @param {Boolean} enabled
     */
    _setRadioEnabled: function(conn, enabled) {
      if (conn.radioState !== 'enabling' &&
          conn.radioState !== 'disabling' &&
          conn.radioState !== null) {
        this._doSetRadioEnabled(conn, enabled);
      } else {
        conn.addEventListener('radiostatechange',
          function radioStateChangeHandler() {
            if (conn.radioState == 'enabling' ||
                conn.radioState == 'disabling' ||
                conn.radioState == null) {
              return;
            }
            conn.removeEventListener('radiostatechange',
              radioStateChangeHandler);
            this._doSetRadioEnabled(conn, enabled);
        });
      }
    },

    /*
     * An internal function to tell Gecko setRadioEnabled
     *
     * @param {MozMobileConnection} conn
     * @param {Boolean} enabled
     */
    _doSetRadioEnabled: function(conn, enabled) {
      var self = this;
      var req = conn.setRadioEnabled(enabled);
      this._setRadioOpCount++;

      req.onsuccess = function() {
        self._setRadioAfterReqsCalled(enabled);
      };

      req.onerror = function() {
        self._isSetRadioOpError = true;
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

        window.dispatchEvent(new CustomEvent(evtName));
      }
    }
  };

  window.Radio = new Radio();
})(window);
