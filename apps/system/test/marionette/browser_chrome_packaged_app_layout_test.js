'use strict';

var assert = require('assert');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
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
      'hosted_nav_app.gaiamobile.org': __dirname + '/hosted_nav_app',
    }
  });

  var home, rocketbar, system;

  setup(function() {
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    system.waitForStartup();
  });

  test('hosted app /w chrome', function() {
    var appOrigin = 'app://hosted_nav_app.gaiamobile.org';
    var frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();

    // Validate page 2
    client.switchToFrame(frame);
    client.helper.waitForElement('a').click();

    client.switchToFrame();
    assert.ok(system.appChromeBack.displayed(), 'Back button is shown.');
    var backRect = system.appChromeBack.scriptWith(function(el) {
      return el.getBoundingClientRect();
    });
    system.appChromeBack.click();

    assert.ok(system.appChromeForward.displayed(), 'Forward button is shown.');
    var forwardRect = system.appChromeForward.scriptWith(function(el) {
      return el.getBoundingClientRect();
    });

    var reloadRect = system.appChromeReloadButton.scriptWith(function(el) {
      return el.getBoundingClientRect();
    });

    var statusbarRect = system.statusbar.scriptWith(function(el) {
      return el.getBoundingClientRect();
    });

    assert.ok(reloadRect.y > statusbarRect.bottom);
    assert.ok(forwardRect.y > statusbarRect.bottom);
    assert.equal(forwardRect.y, backRect.y);
  });
});
