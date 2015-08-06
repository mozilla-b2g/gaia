'use strict';

var assert = require('assert');
var RppMainPanel = require('./lib/panels/rpp_main');

marionette('remote privacy protection main panel', function() {
  var client = marionette.client({
    settings: {
      'privacy-panel-gt-complete': true
    }
  });
  var subject;

  setup(function() {
    subject = new RppMainPanel(client);
    subject.init();
  });

  test('ftu register form is displayed', function() {
    assert.ok(subject.isRegisterFormDisplayed());
    assert.ok(!subject.isLoginFormDisplayed());
  });

  test('ability to register with given passphrase', function() {
    subject.typeNewPassphrase('mypassword');
    subject.waitForPanelToDissapear(subject.selectors.rppPanel);

    assert.ok(subject.isFeaturesPanelDisplayed());
  });

  test('after register we can login using our passphrase', function() {
    subject.typeNewPassphrase('mypassword');
    subject.waitForPanelToDissapear(subject.selectors.rppPanel);
    subject.tapBackBtn(subject.selectors.featuresPanel);
    subject.loadMainPanel();

    assert.ok(subject.isLoginFormDisplayed());
    assert.ok(!subject.isRegisterFormDisplayed());

    subject.typePassphrase('mypassword');
    subject.waitForPanelToDissapear(subject.selectors.rppPanel);

    assert.ok(subject.isFeaturesPanelDisplayed());
  });

});
