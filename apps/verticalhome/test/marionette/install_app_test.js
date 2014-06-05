'use strict';

var assert = require('assert');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var createAppServer = require('./server/parent');

marionette('app installs', function() {
  var client = marionette.client(Home2.clientOptions);

  var server;
  setup(function(done) {
    createAppServer(function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var subject;
  var system;
  setup(function() {
    subject = new Home2(client);
    system = new System(client);
    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  /**
  Tap an icon on the vertical homescreen until it's launched by the system app.
  */
  function tapToLaunch(client, manifest) {
    client = client.scope({ searchTimeout: 100 });
    client.waitFor(function() {
      subject.waitForLaunch();

      // tap the app in the homescreen
      var newApp = client.helper.waitForElement(
        '[data-identifier="' + server.manifestURL + '"]'
      );

      newApp.click();

      // go to the system app
      client.switchToFrame();

      // wait for the app to show up
      var frame;
      try {
        frame = client.findElement(
          'iframe[mozapp="' + server.manifestURL + '"]'
        );
      } catch(e) {
        // try again...
        return false;
      }

      return client.switchToFrame(frame);
    });
  }

  test('install app', function() {
    client.scope({ context: 'chrome' }).executeScript(function(manifest) {
      window.navigator.mozApps.installPackage(manifest);
    }, [server.manifestURL]);

    // go to the system app...
    client.switchToFrame();
    var dialog = client.helper.waitForElement('#app-install-install-button');
    dialog.click();

    tapToLaunch(client, server.manifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});
