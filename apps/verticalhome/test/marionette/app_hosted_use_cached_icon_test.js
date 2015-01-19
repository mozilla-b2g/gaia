/* global __dirname */
'use strict';

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconSrc = require('./lib/icon_src');
var iconCached = require('./lib/icon_cached');

marionette('Vertical Home - Hosted app cached icon fetch', function() {
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

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    system.waitForFullyLoaded();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('fallback to default icon', function() {
    var iconURL = server.manifest.icons['128'];
    // correctly install the app...
    client.switchToFrame();
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());
    var icon = subject.getIcon(server.manifestURL);

    // ensure it is cached
    client.waitFor(function() {
      var src = iconSrc(icon);

      if (!src) {
        return false;
      }

      var hasSource = src.indexOf(iconURL) !== -1;
      var isCached = iconCached(icon);

      return hasSource && isCached;
    });

    // ensure http falls so we use the cached icon
    server.fail(iconURL);

    // kill the window
    subject.restart();
    icon = subject.getIcon(server.manifestURL);

    // check for the cached icon...
    client.waitFor(function() {
      return iconSrc(icon) === 'blobcache';
    });

    // allow the request to succeed
    server.unfail(iconURL);

    // trigger the download of a new icon
    client.executeScript(function() {
      window.dispatchEvent(new CustomEvent('online'));
    });

    // now shows the freshly redownloaded icon
    client.waitFor(function() {
      var src = iconSrc(icon);
      return src && src.indexOf(iconURL) !== -1;
    });
  });

});
