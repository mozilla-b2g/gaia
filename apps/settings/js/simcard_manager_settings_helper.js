/* exported SimSettingsHelper */

'use strict';

(function(exports) {

  /*
   * SimSettingsHelper is a helper to provide semantic ways set / get
   * mozSettings. It is used by SimCardManager.
   */
  var SimSettingsHelper = {
    getCardIndexFrom: function(serviceName, callback) {
      // _get(), _onWhichCard() and _getFromSettingsDB() are internal methods
      // and should be used together, so I wrap them inside this method
      // and expose them outside the world to make sure developers
      // will not call them separately.
      this._get(serviceName)._onWhichCard(callback);
    },
    _get: function(serviceName) {
      this.settingKeys = [];
      switch (serviceName) {
        case 'outgoingCall':
          this.settingKeys.push('ril.telephony.defaultServiceId');
          break;
        case 'outgoingMessages':
          this.settingKeys.push('ril.sms.defaultServiceId');
          break;
        case 'outgoingData':
          this.settingKeys.push('ril.data.defaultServiceId');
          break;
      }
      return this;
    },
    _onWhichCard: function(callback) {
      this.settingKeys.forEach(function(key) {
        this._getFromSettingsDB(key, callback);
      }.bind(this));
    },
    _getFromSettingsDB: function(key, callback) {
      var settings = window.navigator.mozSettings;
      var getReq = settings.createLock().get(key);
      var done = function done() {
        if (callback) {
          // if there is no card set on the service,
          // we will just use the first card
          var previousCardIndex = getReq.result[key] || 0;
          callback(previousCardIndex);
        }
      };
      getReq.onsuccess = done;
      getReq.onerror = done;
    },
    setServiceOnCard: function(serviceName, cardIndex) {
      // _set(), _on() and _setToSettingsDB() are internal methods
      // and should be used together, so I wrap them inside this
      // method and expose them outside the world to make sure
      // developers will not call them separately.
      this._set(serviceName)._on(+cardIndex);
    },
    _set: function(serviceName) {
      // cleanup old keys first
      this.settingKeys = [];

      switch (serviceName) {
        case 'outgoingCall':
          this.settingKeys.push('ril.telephony.defaultServiceId');
          this.settingKeys.push('ril.voicemail.defaultServiceId');
          break;

        case 'outgoingMessages':
          this.settingKeys.push('ril.sms.defaultServiceId');
          break;

        case 'outgoingData':
          this.settingKeys.push('ril.mms.defaultServiceId');
          this.settingKeys.push('ril.data.defaultServiceId');
          break;
      }

      return this;
    },
    _on: function(cardIndex) {
      this.settingKeys.forEach(function(key) {
        this._setToSettingsDB(key, cardIndex);
      }.bind(this));
    },
    _setToSettingsDB: function(key, newValue, callback) {
      var done = function done() {
        if (callback) {
          callback();
        }
      };

      var settings = window.navigator.mozSettings;
      var getReq = settings.createLock().get(key);

      getReq.onsuccess = function() {
        var oldValue = getReq.result[key];

        if (oldValue !== newValue) {
          var setObject = {};
          setObject[key] = newValue;
          var setReq = settings.createLock().set(setObject);

          setReq.onsuccess = done;
          setReq.onerror = done;
        } else {
          done();
        }
      };
      getReq.onerror = done;
    }
  };

  exports.SimSettingsHelper = SimSettingsHelper;

})(window);
