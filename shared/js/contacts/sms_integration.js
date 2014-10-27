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
          target: number
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
