'use strict';

var SmsIntegration = {
  sendSms: function si_sendSms(number) {
    try {
      var activity = new MozActivity({
        name: 'compose-sms',
        data: {
          number: number
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
