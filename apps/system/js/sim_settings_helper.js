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
      window.addEventListener('simslot-updated', this);
    },
    handleEvent: function ssh_handleEvent(evt) {
      switch (evt.type) {
        case 'simslot-updated':
          this.simslotUpdatedHandler();
        break;
      }
    },
    hasOneSim: function() {
      var slots = SIMSlotManager.getSlots();
      var sim0Absent = slots[0].isAbsent();
      var sim1Absent = slots[1].isAbsent();
      if ((sim0Absent && !sim1Absent) ||
          (!sim0Absent && sim1Absent)) {
        return true;
      }
      return false;
    },
    overrideUserSimSettings: function() {
      if (!this.hasOneSim()) {
        return;
      }
      var slots = SIMSlotManager.getSlots();
      var availableSIMIndex = slots[0].isAbsent() ? 1 : 0;

      this.setServiceOnCard('outgoingCall', availableSIMIndex);
      this.setServiceOnCard('outgoingMessages', availableSIMIndex);
      this.setServiceOnCard('outgoingData', availableSIMIndex);
    },
    simslotUpdatedHandler: function() {
      // If the device has 0 or 2 SIMs present, we keep the user settings intact
      if (!this.hasOneSim()) {
        return;
      }

      // We have detected one SIM but we may receive the event for the second
      // one. So we delay writing the settings, hoping that 1s is enough
      setTimeout(this.overrideUserSimSettings.bind(this), 1000);
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
