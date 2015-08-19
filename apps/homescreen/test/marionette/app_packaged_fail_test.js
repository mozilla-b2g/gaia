/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Packaged App Failed Download', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var home, system, appInstall;
  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('failed state then retry and launch', function() {
    client.switchToFrame();

    server.fail(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(server.packageManifestURL);
    home.waitForIconImageUrl(icon, 'failed');

    server.unfail(server.applicationZipUri);

    icon.tap();
    home.actionDialog(home.resumeDownloadDialog, 'resume-download-action');
    home.waitForIconImageUrl(icon, 'app-icon');

    home.launchIcon(icon);
    assert.equal(client.title(), 'iwrotethis');
  });
});

