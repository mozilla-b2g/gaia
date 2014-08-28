'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - App /w Fullscreen Navigation Chrome', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {
      'fullscreennavapp.gaiamobile.org': __dirname + '/fullscreennavapp',
    }
  });

  var actions, home, rocketbar, search, system;
  var halfScreenHeight;

  setup(function() {
    actions = new Actions(client);
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    system.waitForStartup();

    search.removeGeolocationPermission();

    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;
  });

  function waitForOffscreen(selector) {
    client.waitFor(function() {
      var rect = client.findElement(selector).scriptWith(function(element) {
        return element.getBoundingClientRect();
      });
      return rect.bottom < 0;
    });
  }

  function expandRocketbar() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, halfScreenHeight)
      .release()
      .perform();
    assert.ok(system.appUrlbar.displayed(), 'Rocketbar is displayed.');
  }

  test('test fullscreen chrome /w navigation', function() {
    var appOrigin = 'app://fullscreennavapp.gaiamobile.org';
    var frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    waitForOffscreen(System.Selector.appUrlbar);

    // Validate page 1
    expandRocketbar();
    waitForOffscreen(System.Selector.appUrlbar);

    // Validate page 2
    client.switchToFrame(frame);
    client.helper.waitForElement('a').click();

    client.switchToFrame();
    expandRocketbar();
    assert.ok(system.appChromeBack.displayed(), 'Back button is shown.');
    system.appChromeBack.click();
    assert.ok(system.appChromeForward.displayed(), 'Forward button is shown.');
    waitForOffscreen(System.Selector.appUrlbar);
  });
});
