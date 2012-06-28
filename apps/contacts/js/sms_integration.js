'use strict';

var SmsIntegration = {
  sendSms: function si_sendSms(number) {
    try {
      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'websms/sms',
          number: number
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
