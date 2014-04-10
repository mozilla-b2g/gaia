/* global Customizer */

'use strict';

var SmsCustomizer = (function() {
  Customizer.call(this, 'sms', 'json');

  function getPosInteger(num, txtError) {
    if (!num) {
      return null;
    }
    var intPos = Math.floor(num);
    if (isNaN(intPos) || intPos < 0) {
        intPos = null;
    }
    return intPos;
  }

  this.set = function(smsParams) {
    if (!smsParams) {
      console.error('SmsCustomizer. Configuration parameters not received');
      return;
    }
    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('SmsCustomizer. Settings is not available');
      return;
    }

    var maxConcatFloor = getPosInteger(smsParams.smsMaxConcat);
    // Zero is wrong value too.
    if (!maxConcatFloor) {
      console.error('Incorrect value for max concatenated message:' +
                    smsParams.smsMaxConcat);
    }

    var opSizeFloor = getPosInteger(smsParams.mmsSizeLimitation);
    // Zero is wrong value too.
    if (!opSizeFloor) {
      console.error('Incorrect value for MMS message size:' +
                    smsParams.mmsSizeLimitation);
    }

    var settingsValue = {};
    const SMS_MAX_CONCAT = 'operatorResource.sms.maxConcat';
    const MMS_SIZE_LIMIT = 'dom.mms.operatorSizeLimitation';

    if (maxConcatFloor != null) {
      settingsValue[SMS_MAX_CONCAT] = maxConcatFloor;
    }
    if (opSizeFloor != null) {
      settingsValue[MMS_SIZE_LIMIT] = opSizeFloor;
    }

    if (Object.keys(settingsValue).length > 0) {
      settings.createLock().set(settingsValue);
    }
  };
});

var smsCustomizer = new SmsCustomizer();
smsCustomizer.init();
