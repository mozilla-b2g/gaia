'use strict';

var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection Rename', function() {

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
    EmeServer.setServerURL(client, server);
  });

  test('rename collection', function() {
    collection.enterCreateScreen();
    var name = 'Around Me';
    collection.selectNew(name);
    client.apps.switchToApp(Home2.URL);

    home.enterEditMode();
    var icon = collection.getCollectionByName(name);
    home.moveIconToIndex(icon, 0);
    icon.tap();

    collection.renameAndPressEnter('renamed');
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return icon.text() === 'renamed';
    });
  });
});
