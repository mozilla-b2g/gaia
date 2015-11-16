'use strict';

marionette('Homescreen - Pinned Site Uninstall', function() {

  var client = marionette.client();
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('removal of pinned site', function() {
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());
    var one = 1;
    var two = 2;
    client.waitFor(function() {
      return one === two;
    });
  });
});
