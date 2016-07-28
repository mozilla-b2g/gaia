'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Site loading background', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var home, rocketbar, server, system;

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
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    // Need to wait for the homescreen to be ready as this test takes a
    // screenshot. Without the homescreen, we may take a screenshot of the
    // system boot screen.
    client.apps.launch(home.URL);
    client.switchToFrame();
  });

  /**
   * Waits for the background color of the current frame to match given
   * r, g and b values. Takes a screenshot and gets the pixel value of its
   * center using a client side canvas.
   */
  function waitForBackgroundColor(r, g, b) {
    client.waitFor(function() {
      var screenshot = client.screenshot();
      var pix = JSON.parse(
        client.executeAsyncScript(function(screenshot) {
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
        }, [screenshot])
      );
      return pix[0] == r && pix[1] == g && pix[2] == b;
    });
  }

  test('validate loading background color', function() {
    var url = server.url('darkpage.html');
    server.cork(url);

    // Use the home-screen search box to open up the system browser
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);
    var frame = system.waitForBrowser(url);
    waitForBackgroundColor(255, 255, 255);

    server.uncork(url);
    client.switchToFrame(frame);
    client.helper.waitForElement('header > h1');
    waitForBackgroundColor(0, 0, 0);
  });
});
