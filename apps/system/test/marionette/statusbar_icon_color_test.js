'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar');
var Bookmark = require('../../../system/test/marionette/lib/bookmark');
var helper = require('../../../../tests/js-marionette/helper.js');
var SETTINGS_APP = 'app://settings.gaiamobile.org';
var Server = require('../../../../shared/test/integration/server');
var UtilityTray = require('./lib/utility_tray');

marionette('Statusbar colors', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  }, undefined, { 'raisesAccessibilityExceptions': true });

  var system;
  var bookmark;
  var actions;
  var search;
  var rocketbar = new Rocketbar(client);
  var server;
  var utilityTray;

  setup(function() {
    actions = client.loader.getActions();
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    utilityTray = new UtilityTray(client);
    bookmark = new Bookmark(client);
    system.waitForStartup();
  });

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  test('statusbar icons are white in the lockscreen', function() {
    waitVisible();
    waitForDarkColor();
  });

  test('statusbar icons remain white after dark app', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForLightColor();
    helper.lockScreen(client);
    waitForDarkColor();
    helper.unlockScreen(client);
    waitForLightColor();
  });

  test('statusbar icons remain white after task switcher', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForLightColor();
    actions.longPress(system.softwareHome, 1).perform();
    waitForCardsView();
    helper.lockScreen(client);
    waitForDarkColor();
    helper.unlockScreen(client);
    waitForLightColor();
  });

  test('statusbar icons keep color after add homescreen', function() {
    waitVisible();
    helper.unlockScreen(client);
    var url = server.url('sample.html');
    bookmark.openAndSave(url);
    waitForLightColor();
  });

  test('statusbar icons keep color after activity', function() {
    waitVisible();
    helper.unlockScreen(client);
    rocketbar.homescreenFocus();
    var url = server.url('sample.html');
    rocketbar.enterText(url + '\uE006');

    // Ensure that the page is loaded.
    system.gotoBrowser(url);
    client.switchToFrame();

    system.appChromeContextLink.click();
    system.appChromeContextMenuShare.click();
    system.cancelActivity.click();
    waitForLightColor();
  });

  test('statusbar color after activity title change', function() {
    helper.unlockScreen(client);
    waitVisible();
    waitForDarkColor();
    launchSettingsActivity();
    client.waitFor(function() {
      var filter = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).filter;
      });
      return filter.indexOf('none') === -1;
    });
    waitForLightColor();
  });

  test('statusbar icons are dark when utility tray is open', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForLightColor();
    utilityTray.open();
    client.waitFor(function() {
      var filter = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).filter;
      });
      return filter.indexOf('none') > -1;
    });
    waitForDarkColor();
  });

  function launchSettingsActivity() {
    var SMS_APP = 'app://sms.gaiamobile.org';
    client.apps.launch(SMS_APP);
    client.switchToFrame();
    client.executeScript(function() {
      var activity = new window.wrappedJSObject.MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'messaging'
        }
      });
      activity.onsuccess = function() {};
    });
  }

  function waitForCardsView() {
    client.waitFor(function() {
      var className = client.findElement('#screen').getAttribute('class');
      return className.indexOf('cards-view') > -1;
    });
  }

  function waitVisible() {
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  }

  function waitForLightColor() {
    waitForColor(true);
  }

  function waitForDarkColor() {
    waitForColor(false);
  }

  function waitForColor(light) {
    client.waitFor(function() {
      var filter = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).filter;
      });
      var index = filter.indexOf('none');
      return light ? index === -1 : index > -1;
    });
  }

});
