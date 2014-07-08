'use strict';
/* global __dirname */

var assert = require('assert');
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

  test('create collections', function() {
    collection.enterCreateScreen();
    var names = [
      'Around Me',
      'Astrology',
      'Autos'
    ];
    collection.selectNew(names);
    client.apps.switchToApp(Home2.URL);

    // Verify that all collections were created.
    names.forEach(function(name) {
      collection.getCollectionByName(name);
    });
  });

  test('collection name localization', function() {
    var collectionName = 'Entertainment';
    collection.enterCreateScreen();
    collection.selectNew([collectionName]);
    client.apps.switchToApp(Home2.URL);

    var collectionIcon =
      collection.getCollectionByName(collectionName);


    // switch to a different locale
    client.executeScript(function() {
      navigator.mozSettings.createLock().set({
        // this is a dynamicly generated locale from english which is perfect
        // for testing this kind of thing since as long as there is an english
        // locale this will work.
        'language.current': 'qps-ploc'
      });
    });

    var expected = home.l10n(
      '/locales-obj/qps-ploc.json',
      // XXX: harcoded number 376 taken from the fixture
      'collection-categoryId-376'
    );

    client.waitFor(function() {
      return expected === collectionIcon.text();
    });

    server.failAll();

    // Now verify the translation inside of the offline message
    collectionIcon.tap();

    client.switchToFrame();
    client.apps.switchToApp(Collection.URL);

    var offlineMessage = client.helper.waitForElement(
          selectors.offlineMessage);

    // Collections named are stubbed in gaia properties. See:
    // shared/locales/collection_categories/collection_categories.fr.properties
    assert.ok(offlineMessage.text().indexOf(expected) !== -1);

    server.unfailAll();

    client.executeScript(function() {
      window.dispatchEvent(new CustomEvent('online'));
    });

    client.helper.waitForElementToDisappear(offlineMessage);
  });

  test('create collection shows message when offline', function() {
    collection.enterCreateScreen();

    client.switchToFrame();
    client.apps.switchToApp(Collection.URL);

    var expectedMsg = home.l10n(
      '/locales-obj/en-US.json',
      'network-error-message'
    );

    // Wait for listeners to be added
    collection.waitForCreateScreenReady();

    // This is not quite the same path the user sees during a collection create
    // but it should still let us test quite a bit. Instead of following the
    // navigator.isOnline path, we fire an offline event which will also show
    // the same alert.
    client.executeScript(function() {
      setTimeout(function() {
        window.dispatchEvent(new CustomEvent('offline'));
      });
    });

    // Wait for the system alert to be populated with the expected message.
    // Convert the alert to a RegExp.
    expectedMsg = new RegExp('.*' + expectedMsg + '.*');

    client.switchToFrame();
    client.waitFor(function() {
      var msg = client.helper
          .waitForElement('.modal-dialog-alert')
          .text();
      return expectedMsg.test(msg);
    });
  });

  test('pin collection web result', function() {
    collection.enterCreateScreen();

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Enter the created collection.
    collection.enterCollection(
      collection.getCollectionByName(collectionName));

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

  test('uninstall pinned collection web result', function() {
    // Count the number of icons on the home-screen
    var numIcons = home.numIcons;

    collection.enterCreateScreen();

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Enter the created collection.
    collection.enterCollection(
      collection.getCollectionByName(collectionName));

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
    client.apps.switchToApp(Home2.URL);

    // Wait until the bookmarked result is added to the home screen.
    client.waitFor(function() {
      return numIcons + 2 === home.numIcons;
    });

    // Uninstall the bookmark from the home-screen
    var lastIcon = client.findElements(Home2.Selectors.firstIcon).pop();
    var iconId = lastIcon.getAttribute('data-identifier');
    lastIcon.scriptWith(function(el) {
      el.scrollIntoView(false);
    });
    home.enterEditMode(lastIcon);
    var remove = client.helper.waitForElement(lastIcon.findElement('.remove'));
    remove.click();
    home.confirmDialog('remove');
    client.helper.waitForElementToDisappear(lastIcon);

    // Exit edit mode
    client.helper.waitForElement(Home2.Selectors.editHeaderDone).click();

    // Open the collection again and make sure the pinned icon is still there
    collection.enterCollection(
      collection.getCollectionByName(collectionName));
    collection.getIconByIdentifier(iconId);
  });

  test('edit mode with two pinned objects', function() {
    collection.enterCreateScreen();

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Enter the created collection.
    collection.enterCollection(
      collection.getCollectionByName(collectionName));

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

  test('drag icon (/w entry point) into collection', function() {
    var dialerManifest = 'app://communications.gaiamobile.org/manifest.webapp';
    var dialerEntryPoint = 'dialer';

    collection.enterCreateScreen();

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Drag the 'Phone' application into the created collection.
    // We specifically choose phone because it has an entry point.
    var phoneIcon = home.getIcon(dialerManifest, dialerEntryPoint);
    var collectionIcon = collection.getCollectionByName(collectionName);

    var bodyHeight = client.findElement('body').size().height;
    var iconTop = phoneIcon.scriptWith(function(el) {
      return el.getBoundingClientRect().top;
    });

    actions
      .press(phoneIcon)
      .wait(1)

      // Move the phone icon to the bottom of the screen to scroll down.
      .moveByOffset(0, bodyHeight - iconTop)
      .wait(4)

      // Now drop the icon into the collection
      .move(collectionIcon)
      .release()
      .wait(1)
      .perform();

    // Exit edit mode.
    var done = client.helper.waitForElement(Home2.Selectors.editHeaderDone);
    done.click();

    // Enter the created collection.
    collection.enterCollection(collectionIcon);

    assert.equal(collection.firstPinnedResult.text(),
      home.localizedAppName('communications', 'dialer', 'en-US'));
  });
});
