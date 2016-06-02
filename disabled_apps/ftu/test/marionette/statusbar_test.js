/* global require */
'use strict';

var Ftu = require('./lib/ftu');
var assert = require('assert');

marionette('First Time Use >', function() {

  var client = marionette.client({
    profile: Ftu.clientOptions,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var ftu, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    ftu = new Ftu(client);
  });

  test('statusbar', function() {
    client.waitFor(function() {
      return system.statusbar.displayed();
    });
    client.apps.switchToApp(Ftu.URL);
    ftu.waitForFtuReady();
    var finishScreen = client.findElement(Ftu.Selectors.finishScreen);
    while (!finishScreen.displayed()) {
      client.switchToFrame();
      assert.ok(system.statusbar.displayed());
      client.apps.switchToApp(Ftu.URL);
      ftu.goNext();
    }

    ftu.tapTakeTour();
    while (!ftu.isTourFinished()) {
      client.switchToFrame();
      assert.ok(system.statusbar.displayed());
      client.apps.switchToApp(Ftu.URL);
      ftu.tapTourNext();
    }

    client.switchToFrame();
    assert.ok(system.statusbar.displayed());
  });

  test('statusbar icons should be dark', function() {
    client.apps.switchToApp(Ftu.URL);
    ftu.waitForCurtainUp();

    client.switchToFrame();
    client.waitFor(function() {
      return system.statusbar.displayed();
    });
    client.waitFor(function() {
      var className = system.statusbar.scriptWith(function(element) {
        return element.className;
      });
      var index = className.indexOf('light');
      return index > -1;
    });
  });

  test('statusbar icons should change', function() {
    client.apps.switchToApp(Ftu.URL);
    ftu.clickThruToFinish();
    client.switchToFrame();
    client.waitFor(function() {
      var className = system.statusbar.scriptWith(function(element) {
        return element.className;
      });
      var index = className.indexOf('light');
      return index <= -1;
    });
  });
});
