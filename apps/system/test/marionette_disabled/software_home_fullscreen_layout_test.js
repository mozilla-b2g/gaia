'use strict';

var assert = require('assert');
var appUrl = 'app://fullscreen_layout.gaiamobile.org';

var ReflowHelper =
    require('../../../../tests/jsmarionette/plugins/reflow_helper.js');

marionette('Software Home Button - Fullscreen Layout', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true,
        'hud.reflows': true
      },
      apps: {
        'fullscreen_layout.gaiamobile.org':
          __dirname + '/../apps/fullscreen_layout'
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var system, actions, screenSize, shbSize;

  setup(function() {
    system = client.loader.getAppClass('system');
    actions = client.loader.getActions();
    system.waitForFullyLoaded();
    client.switchToFrame();
    client.apps.launch(appUrl);
    client.apps.switchToApp(appUrl);
    client.switchToFrame();
    screenSize = client.findElement('#screen').size();
    var shbSelector = '#software-buttons-fullscreen-layout';
    shbSize = client.findElement(shbSelector).size();
  });

  function isDisplayed(element) {
    var classes = element.getAttribute('class');
    return classes.indexOf('hidden') === -1;
  }

  test('Hides after a mozRequestFullscreen request', function() {
    assert.ok(isDisplayed(system.softwareHomeFullscreenLayout));

    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();

    client.switchToFrame();

    client.waitFor(function() {
      return !isDisplayed(system.softwareHomeFullscreenLayout);
    });

    client.executeScript(function() {
      window.wrappedJSObject.document.mozCancelFullScreen();
    });

    system.clickSoftwareHomeButton();
    client.waitFor(function() {
      return client.findElement(system.Selector.activeHomescreenFrame)
        .displayed();
    });
  });

  test('While in requested fullscreen, toggles without reflow',
  function() {
    var reflowHelper = new ReflowHelper(client);
    system.stopDevtools();
    system.stopClock();

    assert.ok(isDisplayed(system.softwareHomeFullscreenLayout));

    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();

    client.switchToFrame();

    reflowHelper.startTracking(system.URL);

    client.waitFor(function() {
      return !isDisplayed(system.softwareHomeFullscreenLayout);
    });

    // Tap to toggle
    var fullScreenElement = client.helper.waitForElement(':-moz-full-screen');

    actions.tap(fullScreenElement).perform();
    client.waitFor(function() {
      return isDisplayed(system.softwareHomeFullscreenLayout);
    });

    actions.tap(fullScreenElement).perform();
    client.waitFor(function() {
      return !isDisplayed(system.softwareHomeFullscreenLayout);
    });

    // Then exit fullscreen
    client.executeScript(function() {
      window.wrappedJSObject.document.mozCancelFullScreen();
    });
    client.waitFor(function() {
      return isDisplayed(system.softwareHomeFullscreenLayout);
    });

    var count = reflowHelper.getCount();
    assert.equal(count, 0, 'we got ' + count + ' reflows instead of 0');
    reflowHelper.stopTracking();
  });

  test('Is shown in an inline activity', function() {
    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    newShareActivity();
    client.switchToFrame();
    system.waitForActivityMenu();
    var bluetooth = system.getActivityOptionMatching('bluetooth');
    actions.tap(bluetooth).perform();
    client.switchToFrame();

    var bluetoothWindow =
      client.helper.waitForElement('.appWindow.inline-activity');
    var bluetoothHeight = bluetoothWindow.cssProperty('height');
    var screenHeight = client.findElement('#screen').size().height;
    var shbSelector = '#software-buttons-fullscreen-layout';
    var shbHeight = client.findElement(shbSelector).size().height;
    assert.ok(bluetoothHeight === ((screenHeight - shbHeight) + 'px'));
  });

  test('activities menu', function() {
    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    newShareActivity();
    client.switchToFrame();
    var menuHeight = system.visibleForm.size().height;
    assert.ok(menuHeight === (screenSize.height - shbSize.height));
  });

  function newShareActivity() {
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
  }
});
