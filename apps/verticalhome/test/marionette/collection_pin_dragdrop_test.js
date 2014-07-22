'use strict';

var Actions = require('marionette-client').Actions;
var Bookmark = require('./lib/bookmark');
var Collection = require('./lib/collection');
var EmeServer = require('./eme_server/parent');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection', function() {

  var client = marionette.client(Home2.clientOptions);
  var actions, bookmark, collection, home, selectors, server, system;

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
    actions = new Actions(client);
    bookmark = new Bookmark(client, server);
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

  test('drag icon (/w entry point) into collection', function() {
    var dialerManifest = 'app://communications.gaiamobile.org/manifest.webapp';
    var dialerEntryPoint = 'dialer';

    collection.enterCreateScreen(1);

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Drag the 'Phone' application into the created collection.
    // We specifically choose phone because it has an entry point.
    var phoneIcon = home.getIcon(dialerManifest, dialerEntryPoint);
    var collectionIcon = collection.getCollectionByName(collectionName);

    actions
      .press(phoneIcon)
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

    var expected = home.localizedAppName('communications', 'dialer', 'en-US');
    client.waitFor(function() {
      return collection.firstPinnedResult.text() === expected;
    });
  });
});
