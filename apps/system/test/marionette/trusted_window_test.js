'use strict';

var Service = require('./lib/system');
var Server = require('../../../../shared/test/integration/server');

var FAKE_APP_URL = 'app://fakeapp.gaiamobile.org';

marionette('trusted window tests', function() {
  var system, frame, server;
  var client = marionette.client({
    profile: {
      apps: {
        'fakeapp.gaiamobile.org': __dirname + '/../apps/fakeapp'
      }
    }
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

  setup(function() {
    system = new Service(client);
    system.waitForStartup();

    client.apps.launch(FAKE_APP_URL);
    frame = system.waitForLaunch(FAKE_APP_URL);
  });

  function getCurrentAppId() {
    client.executeScript(function() {
      var currentApp = window.wrappedJSObject.Service.currentApp;
      return currentApp.getTopMostWindow().instanceID;
    });
  }

  function launchTrusted(requestId, chromeId, url, name) {
    client.switchToFrame();
    // Fire an trusted window in system app.
    client.executeScript(function(requestId, chromeId, url) {
      var frame = document.createElement('iframe');
      frame.src = url;
      window.wrappedJSObject.dispatchEvent(
        new CustomEvent('launchtrusted', {
          detail: {
            name: 'test',
            requestId: requestId,
            chromeId: chromeId,
            frame: frame
          }
        }));
    }, [requestId, chromeId, url, name]);
  }

  test('launch/close trusted window', function() {
    var fakeRequestId = 'request123';
    var fakeChromeEventId = 'chrome321';
    var url = server.url('empty.html');

    launchTrusted(fakeRequestId, fakeChromeEventId, url, 'test');

    var trustedWindow;
    client.waitFor(function() {
      trustedWindow = system.trustedWindow;
      return trustedWindow.displayed();
    });

    system.trustedWindowChrome.tap(25, 25);
    client.waitFor(function() {
      return getCurrentAppId() !== 'trustedwindow';
    });
  });
});
