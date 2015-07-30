'use strict';

var assert = require('assert');

marionette('Software Home Button - Fullscreen Request', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      },
      apps: {
        'fullscreen_request.gaiamobile.org':
          __dirname + '/../apps/fullscreen_request'
      }
    }
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Does not hide after a mozRequestFullscreen request', function() {
    var appUrl = 'app://fullscreen_request.gaiamobile.org';
    client.apps.launch(appUrl);

    var frame = system.waitForLaunch(appUrl);

    assert.ok(!system.softwareHomeFullscreen.displayed());

    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();
    client.switchToFrame();

    client.waitFor(function(){
      return system.softwareHomeFullscreen.displayed() &&
        !system.softwareHomeFullscreenLayout.displayed();
    });

    system.clickSoftwareHomeButton();
    client.waitFor(function(){
      return client.findElement(system.Selector.activeHomescreenFrame)
        .displayed();
    });
  });
});
