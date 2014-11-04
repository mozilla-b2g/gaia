'use strict';

var assert = require('assert');
var PRIVACYPANEL_TEST_APP = 'app://privacy-panel.gaiamobile.org';

marionette('rpp features panel', function() {
  var client = marionette.client({
    settings: {
      'lockscreen.enabled': false,
      'lockscreen.passcode-lock.enabled': false,
      'rpp.locate.enabled': false,
      'rpp.ring.enabled': false,
      'rpp.lock.enabled': false
    }
  });

  var TRANSITION = 500;
  var featuresPanel;

  setup(function() {
    client.apps.launch(PRIVACYPANEL_TEST_APP);
    client.apps.switchToApp(PRIVACYPANEL_TEST_APP);
    client.helper.waitForElement('body');

    var rppMenuItem = client.findElement('#menu-item-rpp');
    
    rppMenuItem.click();
    client.waitFor(function() {
      return client.findElement('#rpp-main').displayed();
    }, { interval: TRANSITION });

    var registerBox = client.findElement('#rpp-register');
    registerBox.findElement('.pass1').sendKeys('mypassword');
    registerBox.findElement('.pass2').sendKeys('mypassword');
    registerBox.findElement('.rpp-register-ok').click();
    
    featuresPanel = client.findElement('#rpp-features');

    client.waitFor(function() {
      return featuresPanel.displayed();
    }, { interval: TRANSITION });
  });

  test('ability to get to the features panel and see alert', function() {
    assert.ok(
      client.findElement('.overlay').getAttribute('hidden'),
      'modal is displayed when passcode is not set');
  });

  test('ability to set some features', function() {
    featuresPanel.findElement('.btn-blue').click();

    client.waitFor(function() {
      return client.findElement('#rpp-screenlock').displayed();
    }, { interval: TRANSITION });
  });

});
