'use strict';

var StatusBar = require('./lib/statusbar');

marionette('Statusbar Visibility', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'nfc.enabled': true
    }
  });

  var statusBar = new StatusBar(client);
  var actions, halfScreenHeight, system, grippyHeight;

  setup(function() {
    actions = client.loader.getActions();
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;
    var grippy = client.findElement('#utility-tray-grippy');
    grippyHeight = grippy.size().height;
  });

  test('Visibility of date in utility tray', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, halfScreenHeight)
      .release()
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarLabel.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  });

  test('Shadow visibility is hidden when passing the grippyHeight', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, grippyHeight + 1)
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarShadow.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'hidden');
    });
  });

  test('Shadow visibility is visible before the grippyHeight', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, grippyHeight - 1)
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarShadow.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  });


  test('Shadow is visible and maximized on inline activities', function() {
    var BROWSER = 'app://search.gaiamobile.org';
    var frame = system.waitForLaunch(BROWSER);
    client.switchToFrame(frame);
    newShareActivity();
    var sms = system.getActivityOptionMatching('sms');
    actions.tap(sms).perform();

    client.waitFor(function() {
      return system.inlineActivity.displayed();
    });

    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var maximized = system.inlineActivity.findElement('.titlebar-maximized');
      var style = maximized.scriptWith(function(element) {
        return window.getComputedStyle(element);
      });
      return (style.visibility == 'visible' && style.opacity == '1');
    });
  });

  function newShareActivity() {
    client.executeScript(function() {
      var a = new window.wrappedJSObject.MozActivity({
        name: 'share',
        data: {
          type: 'url',
          url: 'myurl'
        }
      });
      a.onerror = function() {
        console.log('Activity error');
      };
    });

    client.switchToFrame();
  }

  // skipping since nfc.enabled triggers HW change and icon is updated
  // on success. Status bar needs to observe nfc.status setting.
  // This will be fixed and reenabled in Bug 1103874
  test.skip('NFC icon is visible', function() {
    statusBar.nfc.waitForIconToAppear();
  });
});
