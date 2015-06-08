/* global BaseModule, MobileConnectionIcon, OperatorIcon, LazyLoader */

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
     * Data connection type mapping result
     */
    this.types = [];
    this.states = [];

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
    'airplanemode-disabled',
    'callschanged'
  ];

  Radio.SETTINGS = [
    'operatorResources.data.icon',
    'ril.radio.disabled'
  ];

  Radio.STATES = [
    'settingEnabled',
    'enabled',
    'isCDMA',
    'getDataConnectionType',
    'dataIcon'
  ];

  BaseModule.create(Radio, {
    name: 'Radio',
    EVENT_PREFIX: 'radio',
    dataIcon: null,

    isCDMA: function(index) {
      return !!this.dataExclusiveCDMATypes[
              this.mobileConnections[index].data.type];
    },

    getDataConnectionType: function(index) {
      return this.types[index];
    },

    '_handle_callschanged': function() {
      this.icon && this.icon.updateData();
    },

    '_handle_airplanemode-enabled': function() {
      this.enabled = false;
    },

    '_handle_airplanemode-disabled': function() {
      this.enabled = true;
    },

    '_observe_ril.radio.disabled': function(value) {
      this.settingEnabled = !value;
      this.icon && this.icon.update();
    },

    '_observe_operatorResources.data.icon': function(value) {
      var dataIcon = value;
      if (!dataIcon) {
        return;
      }
      this.dataIcon = value;

      for (var key in value) {
        //Change only dataIcon values that actually really know
        if (this.mobileDataIconTypes[key]) {
          this.mobileDataIconTypes[key] = dataIcon[key];
        }
      }
      this.publish('dataiconchanged', value, true);
    },

    _onDataChange: function(conn, index) {
      this.types[index] = this.mobileDataIconTypes[conn.data.type];
      if (this.mobileConnections.length === 1) {
        this.operatorIcon.update();
      }
      this.icon && this.icon.update(index);
      this.icon && this.icon.updateData(index);
    },

    _onVoiceChange: function(conn, index) {
      if (this.operatorIcon && this.mobileConnections.length === 1) {
        this.operatorIcon.update();
      }
      this.icon && this.icon.update(index);
    },

    _onRadioStateChange: function(conn, index) {
      this.icon && this.icon.update(index);
      this.debug('radiostatechange: [' + index + '] ' + conn.radioState);
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
      this.dataExclusiveCDMATypes = {
        'evdo0': true, 'evdoa': true, 'evdob': true, // data call only
        '1xrtt': true, 'is95a': true, 'is95b': true  // data call or voice call
      };
      /* A mapping table between technology names
         we would get from API v.s. the icon we want to show. */
      this.mobileDataIconTypes = {
        'lte': '4G', // 4G LTE
        'ehrpd': '4G', // 4G CDMA
        'hspa+': 'H+', // 3.5G HSPA+
        'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
        'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev', // 3G CDMA
        'umts': '3G', // 3G
        'edge': 'E', // EDGE
        'gprs': '2G',
        '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x' // 2G CDMA
      };
      this.service.request('stepReady', '#languages').then(function() {
        this.debug('step is resolved.');
        LazyLoader.load(['js/roaming_icon.js', 
                         'js/signal_icon.js',
                         'js/mobile_connection_icon.js']).then(function() {
                            this._stepReady = true;
                            this.icon = new MobileConnectionIcon(this);
                            this.icon.start();
                         }.bind(this)).catch(function(err) {
                           console.error(err);
                         });
      }.bind(this));
      LazyLoader.load(['js/operator_icon.js']).then(function() {
        this.operatorIcon = new OperatorIcon(this);
        this.operatorIcon.start();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
      this.mobileConnections.forEach(function(conn, index) {
        this.types.push('');
        conn.addEventListener('radiostatechange',
          this._onRadioStateChange.bind(this, conn, index));
        conn.addEventListener('datachange',
          this._onDataChange.bind(this, conn, index));
        conn.addEventListener('voicechange',
          this._onVoiceChange.bind(this, conn, index));
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
