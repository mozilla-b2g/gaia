'use strict';

var System = require('./lib/system');

marionette('System update - Splash screen', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
    }
  });
  var system;

  setup(function() {
    system = new System(client);
    system.waitForStartup();
  });

  test('Show splash after accepting system update', function() {
    client.executeScript(function() {
      window.wrappedJSObject.UpdateManager.systemUpdatable.acceptInstall();
    });

    client.helper.waitForElement('#screen > #system-update-splash');
  });
});
