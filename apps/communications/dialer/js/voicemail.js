'use strict';

var Voicemail = {
  check: function vm_check(number, callback) {
    // check the voicemail number if the number is in the sim card
    var voicemail = navigator.mozVoicemail;
    if (voicemail) {
      var voicemailNumber = voicemail.getNumber();
      if (voicemailNumber == number) {
        callback(true);
        return;
      }
    }

    // check the voicemail number with  with the mozSetting value
    // based on /shared/resources/apn.json
    var settings = navigator.mozSettings;
    var req = settings.createLock().get('ril.iccInfo.mbdn');

    req.onsuccess = function getVoicemailNumber() {
      var isVoicemailNumber = false;
      var voicemailNumbers = req.result['ril.iccInfo.mbdn'];
      var voicemailNumber;

      // TODO: We always use the first icc card here. It should honor the user
      //       default voice sim card setting and which will be handled in
      //       bug 978114.
      if (typeof voicemailNumbers == 'string') {
        voicemailNumber = voicemailNumbers;
      } else {
        voicemailNumber = voicemailNumbers && voicemailNumbers[0];
      }
      if (voicemailNumber === number) {
        isVoicemailNumber = true;
      }
      callback(isVoicemailNumber);
    };

    req.onerror = function getVoicemailNumberError() {
      callback(false);
    };
  }
};
