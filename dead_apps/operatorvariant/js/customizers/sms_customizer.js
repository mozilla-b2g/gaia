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
      return;
    }

    settings.createLock().set({
      'operatorResource.sms.maxConcat': maxConcatFloor
    });
  };
});

var smsCustomizer = new SmsCustomizer();
smsCustomizer.init();
