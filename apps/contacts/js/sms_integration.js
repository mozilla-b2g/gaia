'use strict';

var SmsIntegration = (function() {
  
  var smsApp;
  
  //Walk the apps and look for the sms one
  navigator.mozApps.mgmt.getAll().onsuccess = function onSuccess(e) {
    var apps = e.target.result;
    apps.forEach(function parseApp(app) {
      if(app.manifest.permissions) {
        
        var keys = Object.keys(app.manifest.permissions);
        var permissions = keys.map(function map_perm(key) {
          return app.manifest.permissions[key];
        });
        
        if(permissions.indexOf('sms') != -1) {
          smsApp = app;
          return;
        }
      }
    });
  };
  
  return {
    sendSms: function(phoneNumber) {
      smsApp.launch('#num=' + phoneNumber);
    }
  };
  
})();