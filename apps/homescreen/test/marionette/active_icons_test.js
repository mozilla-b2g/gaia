'use strict';

var assert = require('assert');
var Homescreen = require('./lib/homescreen');

marionette('Active icons', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var homescreen = new Homescreen(client);

  setup(function() {
    client.apps.switchToApp(Homescreen.URL);
  });

  suite(' Click one icon > ', function() {
    test(' Icon is not active ', function() {
      var smsIcon = homescreen.getAppIcon('sms');
      homescreen.tap(smsIcon);

      assert.ok(!homescreen.isActive(smsIcon));
    });
  });

  suite(' Click two icons > ', function() {
    test(' Icons are not active ', function() {
      var smsIcon = homescreen.getAppIcon('sms');
      homescreen.tap(smsIcon);

      var communicationsIcon = homescreen.getAppIcon('communications');
      homescreen.tap(communicationsIcon);

      assert.ok(!homescreen.isActive(smsIcon));
      assert.ok(!homescreen.isActive(communicationsIcon));
    });
  });
});
