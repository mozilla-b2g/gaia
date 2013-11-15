/* exported SettingsHelper */

'use strict';

(function(exports) {

  /*
   *  This is a helper which supplies more semantics
   *  to set something on mozSettings for SimCardManager
   */
  var SettingsHelper = {
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
          var setReq = setLock.set({
            key: newValue
          });

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
