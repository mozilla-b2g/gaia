/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('../server/parent');

marionette('Vertical Home - Hosted App Install', function() {
  var client = marionette.client(require(__dirname + '/client_options.js'));
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

    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('install app', function() {
    client.switchToFrame();
    appInstall.install(server.manifestURL);
    subject.launchAndSwitchToApp(server.manifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});

