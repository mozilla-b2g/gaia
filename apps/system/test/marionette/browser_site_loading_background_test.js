'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Site loading background', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    }
  });

  var home, rocketbar, search, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    // Need to wait for the homescreen to be ready as this test takes a
    // screenshot. Without the homescreen, we may take a screenshot of the
    // system boot screen.
    client.apps.launch(home.URL);
    home.waitForLaunch();
    client.switchToFrame();
  });

  /**
   * Validates the current background color of the current frame.
   * Takes a screenshot and parses the pixel data in canvas.
   */
  function validateBackgroundColor(r, g, b) {
    var screenshot = client.screenshot();
    var pix = client.executeAsyncScript(function(screenshot) {
      var img = document.createElement('img');
      img.src = 'data:image/png;base64,' + screenshot;

      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);
        var x = img.width / 2;
        var y = img.height / 2;

        var pixelData = ctx.getImageData(x, y, 1, 1);
        marionetteScriptFinished(JSON.stringify(pixelData.data));
      };

    }, [screenshot]);
    pix = JSON.parse(pix);
    assert.equal(pix[0], r);
    assert.equal(pix[1], g);
    assert.equal(pix[2], b);
  }

  test('validate loading background color', function() {
    var url = server.url('darkpage.html');
    server.cork(url);

    // Use the home-screen search box to open up the system browser
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    var frame = client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');
    validateBackgroundColor(255, 255, 255);

    server.uncork(url);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    validateBackgroundColor(0, 0, 0);
  });
});
