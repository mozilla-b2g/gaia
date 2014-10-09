'use strict';

var assert = require('assert');
var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');

marionette('Software Home Button - Fullscreen Layout', function() {

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
      'fullscreen_layout.gaiamobile.org':
        __dirname + '/fullscreen_layout'
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

  test('Hides after a mozRequestFullscreen request', function() {
    var appUrl = 'app://fullscreen_layout.gaiamobile.org';
    client.apps.launch(appUrl);
    client.apps.switchToApp(appUrl);
    client.switchToFrame();

    assert.ok(system.softwareHomeFullscreenLayout.displayed());

    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();

    client.switchToFrame();

    client.waitFor(function(){
      return !system.softwareHomeFullscreenLayout.displayed();
    });

    client.executeScript(function(){
      window.wrappedJSObject.document.mozCancelFullScreen();
    });

    system.clickSoftwareHomeButton();
    client.waitFor(function(){
      return client.findElement(System.Selector.activeHomescreenFrame)
        .displayed();
    });
  });
});
