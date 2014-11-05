'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');
var Server = require('../../../../shared/test/integration/server');

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

  var actions, home, rocketbar, search, system, frame, server;
  var halfScreenHeight;

  setup(function(done) {
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

    var appOrigin = 'app://fullscreennavapp.gaiamobile.org';
    frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    waitForOffscreen(System.Selector.appUrlbar);
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done(err);
    });
  });

  teardown(function() {
    server.stop();
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
    actions.flick(system.topPanel, 0, 0, 0, halfScreenHeight).perform();
    assert.ok(system.appUrlbar.displayed(), 'Rocketbar is displayed.');
  }

  test('test fullscreen chrome /w navigation', function() {
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

  test('test progressbar', function() {
    client.switchToFrame(frame);
    var url = server.url('sample.html');
    var link = client.helper.waitForElement('#page2-link');
    server.cork(url);
    link.scriptWith(function(element, url) {
      element.href = url;
    }, [url]);
    link.click();

    client.switchToFrame();
    expandRocketbar();
    var selector = System.Selector.appChromeProgressBar;
    var progressBar = client.helper.waitForElement(selector);
    var chromeSize = system.appChrome.size();
    client.waitFor(function() {
      var pbPosition = progressBar.scriptWith(function(element) {
        return element.getBoundingClientRect();
      });
      return pbPosition.y === chromeSize.height;
    });

    waitForOffscreen(selector);
    var progressbar = client.findElement(System.Selector.appChromeProgressBar);
    client.waitFor(function() {
      return !progressbar.displayed();
    });

    expandRocketbar();
    client.waitFor(function() {
      return progressbar.displayed();
    });
    server.uncork(url);
    client.waitFor(function() {
      return !progressbar.displayed();
    });
  });
});
