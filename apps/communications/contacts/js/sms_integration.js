'use strict';
/* global MozActivity */
/* exported SmsIntegration */
/* jshint nonew: false */

var SmsIntegration = {
  _send: function si_integration(data) {
    try {
      new MozActivity({
        name: 'new',
        data: data
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
