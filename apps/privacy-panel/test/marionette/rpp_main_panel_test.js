'use strict';

var assert = require('assert');
var PRIVACYPANEL_TEST_APP = 'app://privacy-panel.gaiamobile.org';

marionette('rpp main panel', function() {
  var client = marionette.client({
    settings: {
      'lockscreen.enabled': false
    }
  });

  setup(function() {
    client.apps.launch(PRIVACYPANEL_TEST_APP);
    client.apps.switchToApp(PRIVACYPANEL_TEST_APP);
    client.helper.waitForElement('body');
  });

  test('ability to register user with given passphrase', function() {
    var rppMenuItem = client.findElement('#menu-item-rpp');
    
    rppMenuItem.click();
    client.waitFor(function() {
      return client.findElement('#rpp-main').displayed();
    }, { interval: 1000 });

    var registerBox = client.findElement('#rpp-register');
    var loginBox = client.findElement('#rpp-login');
    var featuresPanel = client.findElement('#rpp-features');

    assert.ok(registerBox.displayed());
    assert.ok( ! loginBox.displayed());

    registerBox.findElement('.pass1').sendKeys('mypassword');
    registerBox.findElement('.pass2').sendKeys('mypassword');
    registerBox.findElement('.rpp-register-ok').click();

    client.waitFor(function() {
      return featuresPanel.displayed();
    }, { interval: 1000 });

    featuresPanel.findElement('.back').click();

    client.waitFor(function() {
      return client.findElement('#root').displayed();
    }, { interval: 1000 });

    rppMenuItem.click();
    client.waitFor(function() {
      return client.findElement('#rpp-main').displayed();
    }, { interval: 1000 });

    assert.ok( ! registerBox.displayed());
    assert.ok(loginBox.displayed());

    loginBox.findElement('.pass1').sendKeys('mywrongpassword');
    loginBox.findElement('.rpp-login-ok').click();

    client.waitFor(function() {
      return loginBox.findElement('.validation-message').displayed();
    }, { interval: 100 });

    var errKey = loginBox.findElement('.validation-message')
      .getAttribute('data-l10n-id');
    assert.ok(errKey === 'passphrase-wrong');

    loginBox.findElement('.pass1').clear();
    loginBox.findElement('.pass1').sendKeys('mypassword');
    loginBox.findElement('.rpp-login-ok').click();

    client.waitFor(function() {
      return featuresPanel.displayed();
    }, { interval: 1000 });
  });

});
