'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Wifi Hidden Network Test', function() {
  var ftu;
  var client = marionette.client(Ftu.clientOptions);
  var wifiPassword64 =
    'e93FSJpMGMxRnWHs2vJYyMud5h6u7yEhSC445cz7RdHVxXrj2LCTZPAphzaYuyy2';

  setup(function() {
    ftu = new Ftu(client);
  });

  test('Wi-Fi hidden network password 64 characters', function() {
    client.apps.switchToApp(Ftu.URL);
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#join-hidden-button');

    var input = client.findElement('#hidden-wifi-password');
    var password = input.getAttribute('value');
    assert.equal(password.length, 0);
    input.sendKeys(wifiPassword64);
    password = input.getAttribute('value');
    assert.equal(password.length, 63);
  });
});
