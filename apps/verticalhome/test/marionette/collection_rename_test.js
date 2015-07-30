'use strict';

var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection Rename', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
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
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);

    home.waitForLaunch();
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
    icon.tap();

    collection.renameAndPressEnter('renamed');
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return icon.text() === 'renamed';
    });
  });
});
