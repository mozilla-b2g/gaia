'use strict';

marionette('System update - Splash screen', function() {

  var client = marionette.client();
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Show splash after accepting system update', function() {
    client.executeScript(function() {
      window.wrappedJSObject.UpdateManager.systemUpdatable.acceptInstall();
    });

    client.helper.waitForElement('#screen > #system-update-splash');
  });
});
