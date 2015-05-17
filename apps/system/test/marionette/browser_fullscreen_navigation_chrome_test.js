'use strict';

var assert = require('assert');
var Rocketbar = require('./lib/rocketbar');
var Server = require('../../../../shared/test/integration/server');
var FULLSCREENNAVAPP = __dirname + '/../apps/fullscreennavapp';

marionette('Browser - App /w Fullscreen Navigation Chrome', function() {

  var client = marionette.client({
    apps: {
      'fullscreennavapp.gaiamobile.org': FULLSCREENNAVAPP,
    }
  });

  var actions, home, rocketbar, search, system, frame, server;
  var halfScreenHeight;

  setup(function(done) {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;

    var appOrigin = 'app://fullscreennavapp.gaiamobile.org';
    frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    waitForOffscreen(system.Selector.appUrlbar);
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
    waitForOffscreen(system.Selector.appUrlbar);

    // Validate page 2
    client.switchToFrame(frame);
    client.helper.waitForElement('a').click();

    client.switchToFrame();
    expandRocketbar();
    assert.ok(system.appChromeBack.displayed(), 'Back button is shown.');
    system.appChromeBack.click();
    assert.ok(system.appChromeForward.displayed(), 'Forward button is shown.');
    waitForOffscreen(system.Selector.appUrlbar);
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
    var selector = system.Selector.appChromeProgressBar;
    var progressBar = system.appChromeProgressBar;
    var chromeSize = system.appChrome.size();
    client.waitFor(function() {
      var pbPosition = progressBar.scriptWith(function(element) {
        return element.getBoundingClientRect();
      });
      return pbPosition.y === chromeSize.height;
    });

    waitForOffscreen(selector);
    client.waitFor(function() {
      return !progressBar.displayed();
    });

    expandRocketbar();
    client.waitFor(function() {
      return progressBar.displayed();
    });
    server.uncork(url);
    client.waitFor(function() {
      return !progressBar.displayed();
    });
  });
});
