'use strict';

var Actions = require('marionette-client').Actions;
var System = require('../../../system/test/marionette/lib/system');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar');
var Search = require('../../../../apps/search/test/marionette/lib/search');
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
      'ftu.manifestURL': null,
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  });

  var system;
  var bookmark = new Bookmark(client);
  var actions = new Actions(client);
  var search = new Search(client);
  var rocketbar = new Rocketbar(client);
  var server;
  var utilityTray = new UtilityTray(client);

  setup(function() {
    system = new System(client);
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
    waitForColor(false);
  });

  test('statusbar icons remain white after dark app', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForColor(true);
    helper.lockScreen(client);
    waitForColor(false);
    helper.unlockScreen(client);
    waitForColor(true);
  });

  test('statusbar icons remain white after task switcher', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForColor(true);
    actions.longPress(system.softwareHome, 1).perform();
    waitForCardsView();
    helper.lockScreen(client);
    waitForColor(false);
    helper.unlockScreen(client);
    waitForColor(true);
  });

  test('statusbar icons keep color after add homescreen', function() {
    waitVisible();
    helper.unlockScreen(client);
    var url = server.url('sample.html');
    bookmark.openAndSave(url);
    waitForColor(true);
  });

  test('statusbar icons keep color after activity', function() {
    waitVisible();
    helper.unlockScreen(client);
    search.removeGeolocationPermission();
    rocketbar.homescreenFocus();
    var url = server.url('sample.html');
    rocketbar.enterText(url + '\uE006');

    // Ensure that the page is loaded.
    system.gotoBrowser(url);
    client.switchToFrame();

    system.appChromeContextLink.click();
    system.appChromeContextMenuShare.click();
    system.cancelActivity.click();
    waitForColor(true);
  });

  test('statusbar icons are dark when utility tray is open', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForColor(true);
    utilityTray.open();
    waitForColor(false);
  });

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
