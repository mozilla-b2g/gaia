'use strict';

var assert = require('assert');
var RpMainPanel = require('../lib/panels/rp_features');

marionette('remote protection main panel', function() {
  var client = marionette.client({
    settings: {
      'privacy-panel-gt-complete': true,
      'lockscreen.enabled': true,
      'lockscreen.passcode-lock.enabled': true,
      'rp.locate.enabled': false,
      'rp.ring.enabled': false,
      'rp.lock.enabled': false,
      'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp'
    }
  });
  var subject;

  setup(function() {
    subject = new RpMainPanel(client);
    subject.init();
  });

  test('ability to show features panel', function() {
    assert.ok(subject.isFeaturesPanelDisplayed());
    assert.ok(!subject.isAlertDisplayed());
  });

  test('ability to toggle "locate/ring/lock" features', function() {
    // Enable all
    subject.tapOnLocate();
    client.waitFor(function() {
      return subject.isLocateChecked() && subject.isLocateEnabled();
    });

    subject.tapOnRing();
    client.waitFor(function() {
      return subject.isRingChecked() && subject.isRingEnabled();
    });

    subject.tapOnLock();
    client.waitFor(function() {
      return subject.isLockChecked() && subject.isLockEnabled();
    });

    // Disable all
    subject.tapOnLocate();
    client.waitFor(function() {
      return !subject.isLocateChecked() && !subject.isLocateEnabled();
    });

    subject.tapOnRing();
    client.waitFor(function() {
      return !subject.isRingChecked() && !subject.isRingEnabled();
    });

    subject.tapOnLock();
    client.waitFor(function() {
      return !subject.isLockChecked() && !subject.isLockEnabled();
    });
  });

});
