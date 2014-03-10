'use strict';

var Voicemail = {
  check: function vm_check(number, callback) {
    // check the voicemail number if the number is in the sim card
    var voicemail = navigator.mozVoicemail;
    if (voicemail) {
      // TODO: remove this backward compatibility check
      // after bug-814634 is landed
      var voicemailNumber = voicemail.number ||
          voicemail.getNumber && voicemail.getNumber();
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
      var voicemailNumber = req.result['ril.iccInfo.mbdn'];

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
