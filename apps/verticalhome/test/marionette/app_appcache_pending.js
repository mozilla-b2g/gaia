/* global __dirname */
'use strict';

var assert = require('assert');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Vertical Home - Hosted app failed icon fetch', function() {
  var client = marionette.client(Home2.clientOptions);
  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/appcache';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  function hasClass(element, className) {
    var classes = element.getAttribute('className');
    return classes.indexOf(className) !== -1;
  }

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = new Home2(client);
    system = new System(client);
    appInstall = new AppInstall(client);

    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('shows spinner while downloading', function() {
    // correctly install the app...
    client.switchToFrame();

    // ensure appcache path is delayed
    server.cork(server.manifest.appcache_path);
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());

    var icon = subject.getIcon(server.manifestURL);

    client.waitFor(hasClass.bind(this, icon, 'loading'));
    // let the rest of the app come through
    server.uncork(server.manifest.appcache_path);
    // wait until it is no longer loading
    client.waitFor(function() {
      return !hasClass(icon, 'loading');
    });

    // ensure the app launches!
    subject.launchAndSwitchToApp(server.manifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});



