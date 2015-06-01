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

    client.apps.launch(home.URL);

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);
  });

  test('pin collection web result', function() {
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

    // Bug 1096538 - Ensure you can't drag the item to the top to create a
    // new section.
    var firstIcon = client.findElement(selectors.firstPinnedResult);

    actions.longPress(firstIcon, 1).perform();
    var headerText =
      client.helper.waitForElement(home.Selectors.editHeaderText);

    actions.press(firstIcon).wait(1).move(headerText).release().perform();
    assert.equal(client.findElements(selectors.allDividers).length, 1,
                 'there is only one divider');
  });
});
