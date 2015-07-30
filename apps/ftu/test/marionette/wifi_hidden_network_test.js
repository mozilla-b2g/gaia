'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Wifi Hidden Network Test', function() {
  var ftu, system;
  var client = marionette.client({ profile: Ftu.clientOptions });
  var wifiPassword64 =
    'e93FSJpMGMxRnWHs2vJYyMud5h6u7yEhSC445cz7RdHVxXrj2LCTZPAphzaYuyy2';

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    ftu = new Ftu(client);
  });

  test('Wi-Fi hidden network password 64 characters', function() {
    ftu.client.apps.switchToApp(Ftu.URL);
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#join-hidden-button');

    var input = client.findElement('#hidden-wifi-password');
    var password = input.getAttribute('value');
    assert.equal(password.length, 0);
    input.sendKeys(wifiPassword64);
    password = input.getAttribute('value');
    assert.equal(password.length, 63);
  });

  test('Wi-Fi hidden network show password', function() {
    ftu.client.apps.switchToApp(Ftu.URL);
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#join-hidden-button');

    var hiddenWifiPanel = ftu.client.helper
                          .waitForElement('#hidden-wifi-authentication');
    var showPassword = ftu.client.findElement('#hidden-wifi-show-password');
    var passwordInput = ftu.client.findElement('#hidden-wifi-password');

    assert(hiddenWifiPanel.displayed() &&
          showPassword.displayed() &&
          passwordInput.displayed()
          );

    showPassword.click();
    ftu.client.helper.waitFor(function() {
      return passwordInput.getAttribute('type') === 'text';
    });

    // Make sure input wont get auto-corrected
    assert.equal(passwordInput.getAttribute('x-inputmode'), 'verbatim');
  });

});
