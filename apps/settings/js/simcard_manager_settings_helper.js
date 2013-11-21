/* exported SettingsHelper */

'use strict';

(function(exports) {

  /*
   * SettingsHelper is a helper to provide semantic ways set / get
   * mozSettings. It is used by SimCardManager.
   */
  var SettingsHelper = {
    // get(), onWhichCard() and getFromSettingsDB() should be used together
    get: function(serviceName) {
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
    onWhichCard: function(callback) {
      this.settingKeys.forEach(function(key) {
        this.getFromSettingsDB(key, callback);
      }.bind(this));
    },
    getFromSettingsDB: function(key, callback) {
      var settings = window.navigator.mozSettings;
      var getLock = settings.createLock();
      var getReq = getLock.get(key);
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
    // set(), on() and setToSettingsDB() should be used together
    set: function(serviceName) {
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
    on: function(cardIndex) {
      this.settingKeys.forEach(function(key) {
        this.setToSettingsDB(key, cardIndex);
      }.bind(this));
    },
    setToSettingsDB: function(key, newValue, callback) {
      var done = function done() {
        if (callback) {
          callback();
        }
      };

      var settings = window.navigator.mozSettings;
      var getLock = settings.createLock();
      var getReq = getLock.get(key);

      getReq.onsuccess = function() {
        var oldValue = getReq.result[key];

        if (oldValue !== newValue) {
          var setLock = settings.createLock();
          var setObject = {};
          setObject[key] = newValue;
          var setReq = setLock.set(setObject);

          setReq.onsuccess = done;
          setReq.onerror = done;
        }
        else {
          done();
        }
      };
      getReq.onerror = done;
    }
  };

  exports.SettingsHelper = SettingsHelper;

})(window);
