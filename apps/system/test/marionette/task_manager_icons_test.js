'use strict';

var Server = require('../../../../shared/test/integration/server');
var TaskManager = require('./lib/task_manager');
var Rocketbar = require('./lib/rocketbar');
var FakeApp = require('./lib/fakeapp');
var assert = require('assert');

marionette('Task Manager - Icons', function() {
  var iconAppOrigin = 'iconapp.gaiamobile.org';
  var apps = {};
  apps[iconAppOrigin] = __dirname + '/../apps/icons-app';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var actions, server, system, rocketbar, taskManager;
  var firefoxApp;

  suiteSetup(function(done) {
    Server.create(__dirname + '/../apps/icons-app/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  // using structured art (known colors for each icon image)
  // we can map from a color to a particular size icon image
  var iconColorToSize = {
    '255,255,0,255': 16,
    '0,255,255,255': 32,
    '255,0,255,255': 64,
    '0,0,255,255': 128,
    '255,0,0,255': 256
  };

  function getElementColor(elem, expectedSize) {
    var screenshot = client.screenshot({
      element: elem
    });
    var colorString = client.executeAsyncScript(function(screenshot) {
      var img = document.createElement('img');
      img.src = 'data:image/png;base64,' + screenshot;
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var height = img.height,
            halfHeight = Math.floor(height/2);
        var width = img.height,
            halfWidth = Math.floor(width/2);
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // sample from the middle of the screenshot
        var pixelData = ctx.getImageData(halfWidth, halfHeight, 1, 1);
        var rgba = Array.from(pixelData.data).toString();
        marionetteScriptFinished(rgba);
      };
    }, [screenshot]);
    return colorString;
  }

  setup(function() {
    actions = client.loader.getActions();
    system = client.loader.getAppClass('system');
    taskManager = new TaskManager(client);
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
  });

  suite('Firefox Apps', function() {
    setup(function() {
      firefoxApp = new FakeApp(client, 'app://' + iconAppOrigin);
      firefoxApp.launch();
      system.goHome();
      system.waitUntilScreenshotable(firefoxApp.iframe);
    });

    test('use icon from app manifest', function() {
      // launch the app and wait for icon to be displayed
      taskManager.show();

      var icon = taskManager.getIconForCard(0);
      client.waitFor(function() {
        return icon.displayed &&
               icon.getAttribute('class').indexOf('pending') === -1;
      });

      var expectedColor = '0,255,255,255';
      var expectedSize = 32;

      var actualColor = getElementColor(icon);
      var actualSize = iconColorToSize[actualColor];
      assert(actualColor === expectedColor);
      assert(actualSize === expectedSize);
    });
  });

  suite('Web Content', function() {

    function loadUrl(url) {
      rocketbar.homescreenFocus();
      rocketbar.enterText(url, true);
      system.gotoBrowser(url);
      client.switchToFrame();
      system.goHome();
    }

    test('page with web manifest should use icon from manifest', function() {
      var appUrl = server.url('webapp.html');
      loadUrl(appUrl);
      taskManager.show();

      var icon = taskManager.getIconForCard(0);
      client.waitFor(function() {
        return icon.displayed &&
               icon.getAttribute('class').indexOf('pending') === -1;
      });

      var expectedColor = '255,0,255,255';
      var expectedSize = 64; // see webapp.json

      var actualColor = getElementColor(icon);
      var actualSize = iconColorToSize[actualColor];
      assert(actualColor === expectedColor);
      assert(actualSize === expectedSize);
    });

    test('page that defines linked icon', function() {
      var page1Url = server.url('linked-icon.html');
      loadUrl(page1Url);
      taskManager.show();

      var icon = taskManager.getIconForCard(0);
      client.waitFor(function() {
        return icon.displayed &&
               icon.getAttribute('class').indexOf('pending') === -1;
      });

      // <link> points at 256x256.png, which is red
      var expectedColor = '255,0,0,255';
      var expectedSize = 256;

      var actualColor = getElementColor(icon);
      var actualSize = iconColorToSize[actualColor];
      assert(actualColor === expectedColor);
      assert(actualSize === expectedSize);
    });

    test('page that defines no favicon uses hostname/favicon', function() {
      var page2Url = server.url('favicon-only.html');
      loadUrl(page2Url);
      taskManager.show();

      var icon = taskManager.getIconForCard(0);
      client.waitFor(function() {
        return icon.displayed &&
               icon.getAttribute('class').indexOf('pending') === -1;
      });

      // NOTE: we should actually get the 32x32 png from the favicon.ico
      // but while bug 961893 remains open we'll actually get the first/smallest
      var expectedColor = '255,255,0,255';
      var expectedSize = 16;

      var actualColor = getElementColor(icon);
      var actualSize = iconColorToSize[actualColor];
      assert(actualColor === expectedColor);
      assert(actualSize === expectedSize);
    });
  });

});
