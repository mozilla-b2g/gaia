/* exported SimSettingsHelper */
/* global SIMSlotManager, SettingsListener */
'use strict';

(function(exports) {

  // we have to make sure we are in DSDS
  if (!SIMSlotManager.isMultiSIM()) {
    return;
  }

  var SimSettingsHelper = {
    init: function ssh_init() {
      window.addEventListener('simslotready', this);
    },
    handleEvent: function ssh_handleEvent(evt) {
      switch (evt.type) {
        case 'simslotready':
          this.simslotUpdatedHandler();
        break;
      }
    },
    overrideUserSimSettings: function() {
      var availableSIMIndex = SIMSlotManager.isSIMCardAbsent(0) ? 1 : 0;
      this.setServiceOnCard('outgoingCall', availableSIMIndex);
      this.setServiceOnCard('outgoingMessages', availableSIMIndex);
      this.setServiceOnCard('outgoingData', availableSIMIndex);
    },
    simslotUpdatedHandler: function() {
      if (SIMSlotManager.hasOnlyOneSIMCardDetected()) {
        this.overrideUserSimSettings();
      }
    },
    setServiceOnCard: function ssh_setServiceOnCard(serviceName, cardIndex) {
      var mozKeys = [];

      switch (serviceName) {
        case 'outgoingCall':
          mozKeys.push('ril.telephony.defaultServiceId');
          mozKeys.push('ril.voicemail.defaultServiceId');
          break;

        case 'outgoingMessages':
          mozKeys.push('ril.sms.defaultServiceId');
          break;

        case 'outgoingData':
          mozKeys.push('ril.mms.defaultServiceId');
          mozKeys.push('ril.data.defaultServiceId');
          break;
      }

      mozKeys.forEach(function(eachKey) {
        var setObj = {};
        setObj[eachKey] = cardIndex;
        SettingsListener.getSettingsLock().set(setObj);
      });
    }
  };

  SimSettingsHelper.init();
  exports.SimSettingsHelper = SimSettingsHelper;

})(window);
