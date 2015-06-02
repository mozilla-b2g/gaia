'use strict';

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var actions, bookmark, collection, home, selectors, server, system;

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
    bookmark = new Bookmark(client, server);
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);
  });

  test('uninstall pinned collection web result', function() {
    // Count the number of icons on the home-screen
    var numIcons = home.numIcons;

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

    // Pin the first icon
    collection.pin(collection.firstWebResult);

    // Wait until a new section is created for the pinned result
    client.waitFor(function() {
      var currentDividers = client.findElements(selectors.allDividers).length;
      return currentDividers === numDividers + 1;
    });

    // Bookmark the first unpinned icon
    collection.bookmark(bookmark, collection.firstWebResult);

    // Get back to the home screen
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(home.URL);

    // Wait until the bookmarked result is added to the home screen.
    client.waitFor(function() {
      return numIcons + 2 === home.numIcons;
    });

    // Uninstall the bookmark from the home-screen
    var lastIcon = client.findElements(home.Selectors.firstIcon).pop();
    var iconId = lastIcon.getAttribute('data-identifier');
    // if we scroll now, marionette won't find the collection icon later:
    // Bug 1046706
    home.moveIconToIndex(lastIcon, 1);
    home.enterEditMode(lastIcon);
    var remove = client.helper.waitForElement(lastIcon.findElement('.remove'));
    remove.tap();
    home.confirmDialog('remove');
    client.helper.waitForElementToDisappear(lastIcon);

    // Exit edit mode
    client.helper.waitForElement(home.Selectors.editHeaderDone).click();

    // Open the collection again and make sure the pinned icon is still there
    collection.enterCollection(
      collection.getCollectionByName(collectionName));
    collection.getIconByIdentifier(iconId);
  });
});
