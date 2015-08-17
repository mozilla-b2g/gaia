/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Hosted app failed icon fetch', function() {
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

  test('fallback to default icon', function() {
    var iconURL = server.manifest.icons['128'];

    // correctly install the app...
    client.switchToFrame();

    // ensure the icon fails to download!
    server.fail(iconURL);
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(server.manifestURL);

    // ensure the default icon is shown
    client.waitFor(function() {
      var src = home.getIconImageUrl(icon);
      return src && src.indexOf('default') !== -1;
    });

    // ensure the icon can be launched!
    home.launchIcon(icon);
    assert.equal(client.title(), 'iwrotethis');
  });
});


