/* global __dirname */
'use strict';

marionette('App Usage Metrics >', function() {
  var assert = require('assert');
  var url = require('url');

  var Server = require('../../../../shared/test/integration/server');
  var Settings = require('../../../settings/test/marionette/app/app');
  var AppInstall = require('./lib/app_install');
  var AppUsageMetrics = require('./lib/app_usage_metrics');

  var ALARM_APP = 'app://fakealarm.gaiamobile.org';
  var ALARM_MANIFEST = ALARM_APP + '/manifest.webapp';

  var MEDIA_APP = 'app://fakemedia.gaiamobile.org';
  var MEDIA_MANIFEST = MEDIA_APP + '/manifest.webapp';

  var MUSIC_APP = 'app://fakemusic.gaiamobile.org';
  var MUSIC_MANIFEST = MUSIC_APP + '/manifest.webapp';

  var TEMPLATE_APP = 'app://template.gaiamobile.org';
  var TEMPLATE_MANIFEST = TEMPLATE_APP + '/manifest.webapp';
  var TEMPLATE_NAME = 'Template';

  var client = marionette.client({
    profile: {
      apps: {
        'fakealarm.gaiamobile.org': __dirname + '/../apps/fakealarmapp',
        'fakemedia.gaiamobile.org': __dirname + '/../apps/fakemediaapp',
        'fakemusic.gaiamobile.org': __dirname + '/../apps/fakemusic'
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  function waitForEvent(name, callback) {
    client.executeAsyncScript(function() {
      window.addEventListener(name, function(evt) {
        marionetteScriptFinished();
      });
    }, callback);
  }

  var sys, metrics, settings, confirmDialog;
  var appInstall, server, serverManifestURL, serverRootURL;

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
    settings = new Settings(client);
    metrics = new AppUsageMetrics(client);
    sys = client.loader.getAppClass('system');
    confirmDialog = client.loader.getAppClass('system', 'confirm_dialog');

    sys.waitForStartup();
    metrics.waitForStartup();
  });

  test('Open and close events are counted', function() {
    sys.waitForLaunch(MEDIA_APP);

    assert.equal(metrics.getAppInvocations(MEDIA_MANIFEST), 0);
    client.apps.close(MEDIA_APP);

    assert.equal(metrics.getAppInvocations(MEDIA_MANIFEST), 1);
    assert.ok(metrics.getAppUsageTime(MEDIA_MANIFEST) > 0);
  });

  test('Multiple app opens are counted', function() {
    [MEDIA_APP, MUSIC_APP, ALARM_APP].forEach(function(app) {
      sys.waitForLaunch(app);
    });
    client.switchToFrame();

    assert.equal(metrics.getAppInvocations(MEDIA_MANIFEST), 1);
    assert.ok(metrics.getAppUsageTime(MEDIA_MANIFEST) > 0);

    assert.equal(metrics.getAppInvocations(MUSIC_MANIFEST), 1);
    assert.ok(metrics.getAppUsageTime(MUSIC_MANIFEST) > 0);

    assert.equal(metrics.getAppInvocations(ALARM_MANIFEST), 0);
    assert.equal(metrics.getAppUsageTime(ALARM_MANIFEST), 0);

    client.apps.close(ALARM_APP);
    assert.equal(metrics.getAppInvocations(ALARM_MANIFEST), 1);
    assert.ok(metrics.getAppUsageTime(ALARM_MANIFEST) > 0);
  });

  test('Installed apps are counted', function() {
    var marketplaceOrigins = client.executeScript(function(testOrigin) {
        var aum = window.wrappedJSObject.core.appUsageMetrics;
        aum.constructor.MARKETPLACE_ORIGINS.push(testOrigin);
        return aum.constructor.MARKETPLACE_ORIGINS;
    }, [sys.origin]);
    console.log('marketplaceOrigins: ', marketplaceOrigins);

    appInstall.install(serverManifestURL);
    client.waitFor(function() {
      return appInstall.isAppInstalled(serverManifestURL);
    });
    client.helper.waitForElementToDisappear(appInstall.installDialog);

    var setupDialog = appInstall.setupDialog;
    if (setupDialog) {
      var cancelButton = client.helper.waitForElement('#setup-cancel-button');
      cancelButton.click();
      client.helper.waitForElementToDisappear(setupDialog);
    }

    var installs = metrics.getAppInstalls(serverManifestURL);
    console.log('did it get installed? ',
                appInstall.isAppInstalled(serverManifestURL));
    assert.equal(installs, 1,
                 installs +' were counted in usage metrics, expected 1');
  });

  test('Uninstalled apps are counted', function() {
    var frame = sys.waitForLaunch(Settings.ORIGIN);
    client.switchToFrame(frame);

    client.helper.waitForElement(Settings.Selectors.menuItemsSection);
    var panel = settings.appPermissionPanel;
    var apps = panel.appList.filter(function(element) {
      return TEMPLATE_NAME === element.text();
    });
    assert.equal(apps.length, 1);

    apps[0].click();
    panel.uninstallButton.click();

    // use confirm dialog helper to confirm uninstall
    client.switchToFrame();
    confirmDialog.confirm('remove');
    // Wait for the app to be uninstalled and the list item is gone.
    client.helper.waitForElementToDisappear(apps[0]);

    var uninstalls = metrics.getAppUninstalls(TEMPLATE_MANIFEST);
    assert.equal(uninstalls, 1);
  });

  test('App usage is counted after screen lock and unlock',
  function(done) {
    var chromeClient = client.scope({ context: 'chrome' });

    function startTest() {
      chromeClient.executeScript(function() {
        navigator.mozSettings.createLock().set({
          'lockscreen.enabled': true
        });
      }, function(err) {
        assert.ok(!err);
        sys.waitForLaunch(MEDIA_APP);

        // Wait at half a second so app usage is recorded when the screen locks
        setTimeout(lockScreen, 500);
      });
    }

    function lockScreen() {
      client.executeScript(function() {
        window.wrappedJSObject.Service.request('lock', { 'forcibly': true });
      });
      waitForEvent('lockscreen-appopened', checkMetrics);
    }

    function checkMetrics() {
      assert.equal(metrics.getAppInvocations(MEDIA_MANIFEST), 1);
      assert.ok(metrics.getAppUsageTime(MEDIA_MANIFEST) > 0);

      client.executeScript(function() {
        window.wrappedJSObject.Service.request('unlock', { 'forcibly': true });
      });

      client.apps.close(MEDIA_APP);
      assert.equal(metrics.getAppInvocations(MEDIA_MANIFEST), 2);

      chromeClient.executeScript(function() {
        navigator.mozSettings.createLock().set({
          'lockscreen.enabled': false
        });
      });
      done();
    }

    startTest();
  });
});
