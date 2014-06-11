'use strict';
/* global MozActivity */
/* exported SmsIntegration */
/* jshint nonew: false */

var SmsIntegration = {
  sendSms: function si_sendSms(number) {
    try {
      new MozActivity({
        name: 'new',
        data: {
          type: 'websms/sms',
          number: number
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },
  sendMms: function si_sendMms(email) {
    try {
      new MozActivity({
        name: 'new',
        data: {
          type: 'webmms/mms',
          email: email
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
