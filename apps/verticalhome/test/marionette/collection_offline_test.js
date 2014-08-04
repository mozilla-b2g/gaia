'use strict';

var Collection = require('./lib/collection');
var EmeServer = require('./eme_server/parent');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection', function() {

  var client = marionette.client(Home2.clientOptions);
  var collection, home, selectors, server, system;

  suiteSetup(function(done) {
    var folder = __dirname + '/fixtures/everythingme';
    EmeServer(folder, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  suiteTeardown(function(done) {
    server.close(done);
  });

  setup(function() {
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    client.apps.launch(Home2.URL);

    home.waitForLaunch();
    collection.disableGeolocation();
    collection.setServerURL(server);
  });

  test('create collection shows message when offline', function() {
    collection.enterCreateScreen();

    client.switchToFrame();
    client.apps.switchToApp(Collection.URL);

    var expectedMsg = home.l10n(
      '/locales-obj/en-US.json',
      'network-error-message'
    );

    // Wait for listeners to be added
    collection.waitForCreateScreenReady();

    // This is not quite the same path the user sees during a collection create
    // but it should still let us test quite a bit. Instead of following the
    // navigator.isOnline path, we fire an offline event which will also show
    // the same alert.
    client.executeScript(function() {
      setTimeout(function() {
        window.dispatchEvent(new CustomEvent('offline'));
      });
    });

    // Wait for the system alert to be populated with the expected message.
    // Convert the alert to a RegExp.
    expectedMsg = new RegExp('.*' + expectedMsg + '.*');

    client.switchToFrame();
    client.waitFor(function() {
      var msg = client.helper
          .waitForElement('.modal-dialog-alert')
          .text();
      return expectedMsg.test(msg);
    });
  });
});
