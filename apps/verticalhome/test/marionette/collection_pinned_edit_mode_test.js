'use strict';

var assert = require('assert');
var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
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

  test('edit mode with two pinned objects', function() {
    collection.enterCreateScreen();

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(home.URL);

    var collectionIcon = collection.getCollectionByName(collectionName);

    // helps marionette finding the icon: Bug 1046706
    home.moveIconToIndex(collectionIcon, 0);
    // Enter the created collection.
    collection.enterCollection(collectionIcon);

    collection.pin(collection.firstWebResult);
    collection.pin(collection.firstWebResult);

    // This identifier matches up to an item in categories_list.json
    var secondIdentifier = 'http://mozilla2.org/firefox';
    var secondPinned = client.helper.waitForElement(
      '.icon[data-identifier="' + secondIdentifier + '"]');
    var secondLocation = secondPinned.location().x;

    var firstPinned = collection.firstPinnedResult;

    actions
      .press(firstPinned)
      .wait(1)
      .move(secondPinned)
      .wait(1)
      .release()
      .wait(1)
      .perform();

    assert.equal(secondLocation, firstPinned.location().x,
      'the first icon has moved to the right.');
    assert.ok(secondPinned.location().x < secondLocation,
      'the second icon has moved to the left.');
  });
});
