'use strict';

var Keys = {
  'enter': '\ue006',
  'left': '\ue012',
  'right': '\ue014'
};

var assert = require('chai').assert;
var AppInstaller = require('./lib/app_install');
var Server = require('../../../../shared/test/integration/server');

marionette('app install manager tests', function() {
  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var system;
  var appInstaller;
  var server;
  var serverManifestURL;
  var serverIMEURL;

  suiteSetup(function(done) {
    Server.create(__dirname + '/../apps/hosted-app', function(err, _server) {
      server = _server;
      serverManifestURL = server.url('manifest.webapp');
      serverIMEURL = server.url('ime_manifest.webapp');
      done(err);
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    system = client.loader.getAppClass('smart-system', 'system', 'tv_apps');
    system.waitForStartup();
    system.waitForFullyLoaded();
    appInstaller = new AppInstaller(client);
  });

  test('install app', { devices: ['tv'] }, function() {
    // install app
    appInstaller.install(serverManifestURL);
    // press install button
    var installButton = client.helper.waitForElement(
                                       system.Selector.appInstallInstallButton);
    installButton.sendKeys(Keys.enter);
    // check app installed
    system.waitForAppInstalled(serverManifestURL);
  });

  test('install app and cancel it', { devices: ['tv'] }, function() {
    // install app
    appInstaller.install(serverManifestURL);
    system.waitForEvent('modal-dialog-opened');

    // press install button
    var cancelInstallButton = client.helper.waitForElement(
                                       system.Selector.appInstallCancelButton);

    cancelInstallButton.sendKeys(Keys.left);
    assert.isTrue(cancelInstallButton.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'cancel button should be focused.');

    cancelInstallButton.sendKeys(Keys.enter);
    system.waitForEvent('modal-dialog-opened');

    var cancelConfirmButton = client.helper.waitForElement(
                                 system.Selector.appCancelInstallConfirmButton);

    assert.isTrue(cancelConfirmButton.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'confirm button should be focused.');
    cancelConfirmButton.sendKeys(Keys.enter);

    assert.isFalse(system.isAppInstalled(serverManifestURL),
      'app should not be installed');
  });

  test('install app and uninstall it', { devices: ['tv'] }, function() {
    // install app
    appInstaller.install(serverManifestURL);
    var installButton = client.helper.waitForElement(
                                       system.Selector.appInstallInstallButton);
    installButton.sendKeys(Keys.enter);
    system.waitForAppInstalled(serverManifestURL);

    // uninstall app
    appInstaller.uninstall(serverManifestURL);
    system.waitForEvent('modal-dialog-opened');

    // wait for dialog
    var confirmButton = client.helper.waitForElement(
                                     system.Selector.appUninstallConfirmButton);
    confirmButton.sendKeys(Keys.right);
    assert.isTrue(confirmButton.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'confirm button should be focused.');
    // uninstall it
    confirmButton.sendKeys(Keys.enter);
    system.waitForAppUninstalled(serverManifestURL);
  });

  test('uninstall and cancel it', { devices: ['tv'] }, function() {
    // install app
    appInstaller.install(serverManifestURL);
    var installButton = client.helper.waitForElement(
                                       system.Selector.appInstallInstallButton);
    installButton.sendKeys(Keys.enter);
    system.waitForAppInstalled(serverManifestURL);

    appInstaller.uninstall(serverManifestURL);

    var cancelButton = client.helper.waitForElement(
                                      system.Selector.appUninstallCancelButton);
    cancelButton.sendKeys(Keys.enter);

    assert.isTrue(system.isAppInstalled(serverManifestURL),
      'app should be installed');
  });

  test('install keyboard app and test setup', { devices: ['tv'] }, function() {
    // install app
    appInstaller.install(serverIMEURL);
    var installButton = client.helper.waitForElement(
                                       system.Selector.appInstallInstallButton);
    installButton.sendKeys(Keys.enter);
    system.waitForAppInstalled(serverIMEURL);

    var laterButton = client.helper.waitForElement(
                                    system.Selector.appInstallSetupLaterButton);
    laterButton.sendKeys(Keys.enter);
    client.helper.waitForElementToDisappear(
                                    system.Selector.appInstallSetupLaterButton);
  });
});
