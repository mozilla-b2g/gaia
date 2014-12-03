'use strict';

var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection Rename', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    client.apps.launch(home.URL);

    home.waitForLaunch();
    collection.disableGeolocation();
    EmeServer.setServerURL(client, server);
  });

  test('rename collection', function() {
    collection.enterCreateScreen();
    var name = 'Around Me';
    collection.selectNew(name);
    client.apps.switchToApp(home.URL);

    home.enterEditMode();
    var icon = collection.getCollectionByName(name);
    home.moveIconToIndex(icon, 0);

    // Try tapping the icon until the dialog opens.
    // For some reason occasionally a reference to the icon can be stale,
    // or it won't trigger the collection screen the first time.
    client.waitFor(function() {
      icon = collection.getCollectionByName(name);

      icon.tap();
      client.switchToFrame();
      try {
        client.apps.switchToApp(Collection.URL);
      } catch(e) {
        client.switchToFrame(system.getHomescreenIframe());
        return false;
      }
      return true;
    });

    collection.renameAndPressEnter('renamed');
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return icon.text() === 'renamed';
    });
  });
});
