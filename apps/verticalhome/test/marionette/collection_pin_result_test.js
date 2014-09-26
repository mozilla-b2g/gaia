'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection', function() {

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

    client.apps.launch(Home2.URL);

    home.waitForLaunch();
    collection.disableGeolocation();
    EmeServer.setServerURL(client, server);
  });

  test('pin collection web result', function() {
    collection.enterCreateScreen();

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    var collectionIcon = collection.getCollectionByName(collectionName);
    // helps marionette finding the icon: Bug 1046706
    home.moveIconToIndex(collectionIcon, 0);
    // Enter the created collection.
    collection.enterCollection(collectionIcon);

    // Count the number of dividers
    var numDividers = client.findElements(selectors.allDividers).length;

    assert.equal(numDividers, 0, 'there are no dividers');

    collection.pin(collection.firstWebResult);

    // Wait until a new section is created.
    client.waitFor(function() {
      var currentDividers = client.findElements(selectors.allDividers).length;
      return currentDividers === numDividers + 1;
    });

    // Bug 1030704 - Ensure the divider is visible
    var firstDivider = client.helper.waitForElement(selectors.allDividers);
    assert.ok(firstDivider.displayed());

    // Compare the position of the first pinned icon to the first web result.
    // The pinned icon should be higher than the web result.
    var firstWebPosition = collection.firstWebResult
      .location();
    var firstPinnedPosition = collection.firstPinnedResult
      .location();
    assert.equal(firstWebPosition.x, firstPinnedPosition.x,
      'items are on the same x-axis');
    assert.ok(firstWebPosition.y > firstPinnedPosition.y,
      'the web result is below the pinned item');
  });
});
