'use strict';
/* global MozActivity */
/* exported MmsIntegration */
/* jshint nonew: false */

var MmsIntegration = {
  sendMms: function si_sendMms(email) {
    try {
      new MozActivity({
        name: 'new',
        data: {
          type: 'websms/email',
          email: email
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
