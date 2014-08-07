'use strict';

var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection', function() {

  var client = marionette.client(Home2.clientOptions);
  var collection, home, selectors, server, system;

  suiteSetup(function(done) {
    EmeServer(client, function(err, _server) {
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

  test('create collections', function() {
    collection.enterCreateScreen();
    var names = [
      'Around Me',
      'Astrology',
      'Autos'
    ];
    collection.selectNew(names);
    client.apps.switchToApp(Home2.URL);

    // Verify that all collections were created.
    names.forEach(function(name) {
      collection.getCollectionByName(name);
    });
  });
});
