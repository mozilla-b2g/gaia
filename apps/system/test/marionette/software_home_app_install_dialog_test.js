'use strict';

var url = require('url');

var AppInstall = require('./lib/app_install');
var Server = require('../../../../shared/test/integration/server');
marionette('Software Home Button - App Install Dialog', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      }
    }
  });
  var appInstall, home, server, serverManifestURL, serverRootURL, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      serverManifestURL = server.url('ime_manifest.webapp');

      // remove trailing slash that the url module leaves
      serverRootURL = url.resolve(serverManifestURL, '..');
      serverRootURL = serverRootURL.substring(0, serverRootURL.length - 1);
      done(err);
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    appInstall = new AppInstall(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for app install dialog and SHB', function() {
    client.executeScript(function install(url) {
      window.wrappedJSObject.navigator.mozApps.install(url);
    }, [serverManifestURL]);

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var sbRect = system.statusbar.scriptWith(rect);
      var dialogRect = appInstall.installDialog.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return dialogRect.bottom === shbRect.top &&
        winHeight === (sbRect.height + dialogRect.height + shbRect.height);
    });
  });
});
