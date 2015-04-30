'use strict';

var assert = require('assert');
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection Pin Bookmark', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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

  var collectionIcon;

  // Hard-coded value from fixture.
  var bookmarkIdentifier = 'http://mozilla1.org/';

  setup(function() {
    actions = client.loader.getActions();
    bookmark = new Bookmark(client);
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);

    // Create a collection
    var name = 'Around Me';
    collection.enterCreateScreen();
    collection.selectNew([name]);
    client.apps.switchToApp(home.URL);
    collectionIcon = collection.getCollectionByName(name);

    // Pin a result of the collection
    // helps marionette finding the icon: Bug 1046706
    home.moveIconToIndex(collectionIcon, 0);
    // Enter the created collection.
    collection.enterCollection(collectionIcon);
    collection.bookmark(bookmark, selectors.firstWebResultNoPinned);

    client.switchToFrame();
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('pins the bookmarked result', function() {
    var bookmarkIcon = home.getIcon(bookmarkIdentifier);
    // scrolling with APZC confuses marionette when tapping: Bug 1046706
    home.moveIconToIndex(bookmarkIcon, 1);

    actions.longPress(bookmarkIcon, 1).perform();
    client.helper.waitForElement(home.Selectors.editHeaderText);

    actions
      // Long tap the bookmark icon
      .press(bookmarkIcon)
      .wait(1)

      // Now drop the icon into the collection
      .move(collectionIcon)
      .release()
      .wait(1)
      .perform();

    // Exit edit mode.
    var done = client.helper.waitForElement(home.Selectors.editHeaderDone);
    done.click();

    collection.enterCollection(collectionIcon);

    var firstPinnedIcon = collection.firstPinnedResult;
    assert.equal(firstPinnedIcon.getAttribute('data-identifier'),
      bookmarkIdentifier);
  });
});
