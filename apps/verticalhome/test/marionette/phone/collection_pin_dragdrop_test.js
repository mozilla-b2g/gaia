'use strict';

var Collection = require('../lib/collection');
var EmeServer = require(
  '../../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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
    actions = client.loader.getActions();
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);
  });

  test('drag icon (/w entry point) into collection', function() {
    var dialerManifest = 'app://communications.gaiamobile.org/manifest.webapp';
    var dialerEntryPoint = 'dialer';

    collection.enterCreateScreen(1);

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(home.URL);

    // Drag the 'Phone' application into the created collection.
    // We specifically choose phone because it has an entry point.
    var phoneIcon = home.getIcon(dialerManifest, dialerEntryPoint);
    var collectionIcon = collection.getCollectionByName(collectionName);
    // helps marionette finding the icon: Bug 1046706
    // note: they should be at this position already
    home.moveIconToIndex(phoneIcon, 0);
    home.moveIconToIndex(collectionIcon, 1);

    actions
      .press(phoneIcon)
      .wait(1)
      .move(collectionIcon)
      .release()
      .wait(1)
      .perform();

    // Exit edit mode.
    var done = client.helper.waitForElement(home.Selectors.editHeaderDone);
    done.click();

    // Enter the created collection.
    collection.enterCollection(collectionIcon);

    var expected = home.localizedAppName('communications', 'dialer', 'en-US');
    client.waitFor(function() {
      return collection.firstPinnedResult.text() === expected;
    });
  });
});
