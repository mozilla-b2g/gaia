define(function() {
  'use strict';

  var conns = window.navigator.mozMobileConnections;

  var CallUtils = {
    /**
     * Helper function. Check whether the phone number is valid or not.
     *
     * @param {String} number The phone number to check.
     * @return {Boolean} Result.
     */
    isPhoneNumberValid: function(number) {
      if (number) {
        var re = /^([\+]*[0-9])+$/;
        if (re.test(number)) {
          return true;
        }
      }
      return false;
    },

    /**
     * Find needed voice rule from passed-in rules. It is possible to have
     * different rules here, but after checking with Gecko gurus, we only
     * use "voice rule" now. So, we only need this one.
     *
     * @param {Array} rules
     * @return {Object}
     */
    findActiveVoiceRule: function(rules) {
      rules = rules || [];
      return rules.find((rule) => {
        return (rule.active &&
          (rule.serviceClass & conns[0].ICC_SERVICE_CLASS_VOICE) !==0);
      });
    }
  };

  return CallUtils;
});
