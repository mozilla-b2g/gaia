'use strict';

var assert = require('chai').assert;
var Ftu = require('./lib/ftu');
var LateCustomization = require('./lib/latecustomization');

var AppInstall =
  require('../../../system/test/marionette/lib/app_install');

marionette('First Time Use >', function() {
  var ftu, lateCustom, home, system, appInstall;
  var settings = {
    'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp',
    'latecustomization.url': 'PLACEHOLDER/late-customization/',
    'latecustomization.operatorInfo': LateCustomization.Settings.operatorInfo
  };

  var client = marionette.client({
    profile: {
      prefs: Ftu.clientOptions.prefs,
      settings: settings
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });


  suite('perform late customization', () => {
    setup(() => {
      ftu = new Ftu(client);
      home = client.loader.getAppClass('homescreen');
      system = client.loader.getAppClass('system');
      appInstall = new AppInstall(client);
      lateCustom = new LateCustomization(client, ftu);
    });

    function createServerSetup(responseFilename, appNames) {
      return function(done) {
        console.log('setup: responseFilename: ', responseFilename);
        lateCustom.manifestResponseFilename = responseFilename;
        lateCustom.startServers(appNames, (err) => {
          if (!err) {
            var apiServer = lateCustom.server.api;
            client.settings.set('latecustomization.url',
                                apiServer.url + '/' + responseFilename);
          }
          done(err);
        });
      };
    }

    teardown((done) => {
      lateCustom.stopServers(done);
    });

    suite('with apps', function() {
      setup(createServerSetup(
        'late-customization-operator.json',
        ['bakewell']
      ));
      setup(() => {
        client.apps.switchToApp(Ftu.URL);
        ftu.waitForCurtainUp();
        var url = client.settings.get('latecustomization.url');
        lateCustom.waitForServerRequest(url);
      });

      test('free apps panel is shown', () => {
        // click through to the free apps panel
        var finishScreen = client.findElement(Ftu.Selectors.finishScreen);
        var seenLCPanel = false;
        var hash;
        while (!seenLCPanel && !finishScreen.displayed()) {
          hash = ftu.getLocationHash();
          seenLCPanel = hash.indexOf(lateCustom.hash) === 0;
          if (seenLCPanel) {
            // check the expected apps are in the list
            var items = lateCustom.appItems;
            assert.equal(items.length, 1);
            assert.equal(items[0].findElement('p').text(), 'Bakewell Tart');
          }
          ftu.goNext();
        }
        assert.ok(seenLCPanel);
      });

      test('> apps are installed', () => {
        var appManifestUrl = lateCustom.translateAliasedUrl(
          'http://bakewell.host/manifest.webapp');

        ftu.clickThruToFinish();

        // verify server got request for app manifest
        lateCustom.waitForServerRequest(appManifestUrl);

        client.switchToFrame();
        assert.ok(!appInstall.installDialog.displayed(),
                  'installDialog not displayed');

        client.apps.switchToApp(Ftu.URL);
        client.waitFor(() => {
          return lateCustom.isInstalled(appManifestUrl);
        });

        ftu.skipTourButton.tap();
        client.switchToFrame();
        home.waitForLaunch();

        // verify the app actually got installed
        // and can be launched from homescreen
        var newIcon;
        client.waitFor(() => {
          return (newIcon = home.getIcon(appManifestUrl));
        });
        assert.ok(newIcon, 'found new icon on homescreen');

        home.scrollIconToCenter(newIcon);
        home.launchIcon(newIcon);
      });
    });

    suite('no apps', () => {
      setup(createServerSetup(
        'late-customization.json',
        []
      ));
      setup(() => {
        client.apps.switchToApp(Ftu.URL);
        ftu.waitForCurtainUp();
        var url = client.settings.get('latecustomization.url');
        lateCustom.waitForServerRequest(url);
      });

      test('hide panel with no apps', () => {
        // click through to finish, ensure free apps panel is not displayed
        var finishScreen = client.findElement(Ftu.Selectors.finishScreen);
        var seenLCPanel = false;
        var hash;
        while (!seenLCPanel && !finishScreen.displayed()) {
          hash = ftu.getLocationHash();
          seenLCPanel = hash.indexOf(lateCustom.hash) === 0;
          ftu.goNext();
        }
        assert.ok(!seenLCPanel);
      });
    });

    suite('server error', function() {
      setup(createServerSetup(
        'late-customization-operator.json',
        ['bakewell']
      ));
      setup(() => {
        var apiServer = lateCustom.server.api;
        apiServer.serverError('/late-customization-operator.json');

        client.apps.switchToApp(Ftu.URL);
        ftu.waitForCurtainUp();
        var url = client.settings.get('latecustomization.url');
        lateCustom.waitForServerRequest(url);
      });

      test('FTU operates normally without valid server response', () => {
        // click through to finish, ensure free apps panel is not displayed
        var finishScreen = client.findElement(Ftu.Selectors.finishScreen);
        var seenLCPanel = false;
        var hash;
        while (!seenLCPanel && !finishScreen.displayed()) {
          hash = ftu.getLocationHash();
          seenLCPanel = hash.indexOf(lateCustom.hash) === 0;
          ftu.goNext();
        }
        assert.ok(!seenLCPanel);
      });
    });
  });

});
