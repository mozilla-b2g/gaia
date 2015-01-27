'use strict';

var Actions = require('marionette-client').Actions;
var Collection = require('./lib/collection');
var Home2 = require('./lib/home2');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection Browser', function() {

  var client = marionette.client(Home2.clientOptions);
  var actions, collection, home, selectors, server, system;

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
    actions = new Actions(client);
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    home.waitForLaunch();
    collection.disableGeolocation();
    EmeServer.setServerURL(client, server);
  });

  test('able to drag browser into collection', function() {
    var browserManifest = 'app://search.gaiamobile.org/manifest.webapp';

    collection.enterCreateScreen(1);

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Drag the 'Browser' application into the created collection.
    var browserIcon = home.getIcon(browserManifest);
    var collectionIcon = collection.getCollectionByName(collectionName);
    // helps marionette finding the icon: Bug 1046706
    // note: they should be at this position already
    home.moveIconToIndex(browserIcon, 0);
    home.moveIconToIndex(collectionIcon, 1);

    actions
      .press(browserIcon)
      .wait(1)
      .move(collectionIcon)
      .release()
      .wait(1)
      .perform();

    // Exit edit mode.
    var done = client.helper.waitForElement(Home2.Selectors.editHeaderDone);
    done.click();

    // Enter the created collection.
    collection.enterCollection(collectionIcon);

    var expected = home.localizedAppName('search', null, 'en-US');
    client.waitFor(function() {
      return collection.firstPinnedResult.text() === expected;
    });
  });
});
