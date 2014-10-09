'use strict';

var assert = require('assert');
var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');
var Actions = require('marionette-client').Actions;
var appUrl = 'app://fullscreen_layout.gaiamobile.org';

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
  var home, system, actions;

  setup(function() {
    home = new Home(client);
    system = new System(client);
    actions = new Actions(client);
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
    client.apps.launch(appUrl);
    client.apps.switchToApp(appUrl);
    client.switchToFrame();
  });

  test('Hides after a mozRequestFullscreen request', function() {
    assert.ok(system.softwareHomeFullscreenLayout.displayed());

    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();

    client.switchToFrame();

    client.waitFor(function() {
      return !system.softwareHomeFullscreenLayout.displayed();
    });

    client.executeScript(function() {
      window.wrappedJSObject.document.mozCancelFullScreen();
    });

    system.clickSoftwareHomeButton();
    client.waitFor(function() {
      return client.findElement(System.Selector.activeHomescreenFrame)
        .displayed();
    });
  });

  test('Is shown in an inline activity', function() {
    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    client.executeScript(function() {
      var a = new window.wrappedJSObject.MozActivity({
        name: 'share',
        data: {
          type: 'video/*',
          number: 1,
          blobs: ['blobs'],
          filenames: ['names'],
          filepaths: ['fullpaths']
        }
      });
      a.onerror = function() {
        console.log('Activity error');
      };
    });
    client.switchToFrame();
    var bluetooth = system.getActivityOptionMatching('bluetooth');
    actions.tap(bluetooth).perform();
    client.switchToFrame();
    client.waitFor(function() {
      return client.findElement('.appWindow.inline-activity').displayed();
    });

    var bluetoothWindow = client.findElement('.appWindow.inline-activity');
    var bluetoothHeight = bluetoothWindow.cssProperty('height');
    var screenHeight = client.findElement('#screen').size().height;
    var shbSelector = '#software-buttons-fullscreen-layout';
    var shbHeight = client.findElement(shbSelector).size().height;
    assert.ok(bluetoothHeight === ((screenHeight - shbHeight) + 'px'));
  });
});
