'use strict';

var SmsIntegration = {
  sendSms: function si_sendSms(number) {
    try {
      var activity  = new MozActivity({
        name: "new",
        data: {
          type: "websms/sms",
          number: number
        }
      });
      console.log("activity=" + activity);
      activity.onsuccess = function() {
        console.log("onsuccess: " + JSON.stringify(this.result));
      }
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  }
};
