'use strict';

var assert = require('assert');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');

marionette('Software Home Button - Fullscreen Request', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': true
    },
    apps: {
      'fullscreen_request.gaiamobile.org':
        __dirname + '/fullscreen_request'
    }
  });
  var home, system;

  setup(function() {
    home = new Home(client);
    system = new System(client);
    system.waitForStartup();
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
      return client.findElement(System.Selector.activeHomescreenFrame)
        .displayed();
    });
  });
});
