'use strict';

/* global Promise, SettingsCache */

(function(exports) {
  /**
   * This Voicemail module provides an easy way to identify if any given number
   * is voicemail number or not. Voicemail number could be stored in mozSettings
   * under key of 'ril.iccInfo.mbdn' or in navigator.mozVoicemail. User of this
   * module don't need to know where voicemail number stores, just query
   * voicemail number by invoking Voicemail.check()
   *
   * @example
   * Voicemail.check('123', cardIndex).then(function(isVoicemailNumber) {
   *   // do something based on value of isVoicemailNumber
   * });
   *
   */
  var Voicemail = {
    /**
     * Query if a number is voicemail number or not
     *
     * @param {String} number - Number in query
     * @param {Number} [cardIndex] - SIM card index in query, 0 if not specified
     * @returns {Promise} - A Promise that resolves as true if number is
     *                      voicemail number, false otherwise.
     */
    check: function vm_check(number, cardIndex) {
      return new Promise(function(resolve, reject) {
        if (!number) {
          resolve(false);
          return;
        }

        var serviceId = cardIndex;
        // check the voicemail number if the number is in the sim card
        var voicemail = navigator.mozVoicemail;
        if (voicemail) {
          var voicemailNumber = voicemail.getNumber(serviceId);
          if (voicemailNumber === number) {
            resolve(true);
            return;
          }
        }

        // check the voicemail number with the mozSetting value
        // based on /shared/resources/apn.json
        function getVoicemailNumber(value) {
          var isVoicemailNumber = false;
          var voicemailNumbers = value;
          var voicemailNumber;

          if (typeof voicemailNumbers === 'string') {
            voicemailNumber = voicemailNumbers;
          } else {
            voicemailNumber = voicemailNumbers && voicemailNumbers[serviceId];
          }
          if (voicemailNumber === number) {
            isVoicemailNumber = true;
          }
          resolve(isVoicemailNumber);
        }
        SettingsCache.get('ril.iccInfo.mbdn', getVoicemailNumber);
      });
    }
  };
  exports.Voicemail = Voicemail;
}(window));
