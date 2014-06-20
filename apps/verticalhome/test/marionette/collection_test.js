'use strict';
/* global __dirname */

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Collection = require('./lib/collection');
var Home2 = require('./lib/home2');
var EmeServer = require('./eme_server/parent');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection', function() {

  var client = marionette.client(Home2.clientOptions);
  var actions, collection, home, selectors, server, system;

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
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    client.apps.launch(Home2.URL);

    home.waitForLaunch();

    // Disable Geolocation prompt
    var chromeClient = client.scope({ context: 'chrome' });
    chromeClient.executeScript(function(origin) {
      var mozPerms = navigator.mozPermissionSettings;
      mozPerms.set(
        'geolocation', 'deny', origin + '/manifest.webapp', origin, false
      );
    }, [Collection.URL]);

    // Update eme server settings
    chromeClient.executeScript(function(url) {
      navigator.mozSettings.createLock().set({
        'everythingme.api.url': url
      });
    }, [server.url + '/{resource}']);
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

  test('pin collection web result', function() {
    collection.enterCreateScreen();

    // A collection name from the list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(Home2.URL);

    // Enter the created collection.
    collection.enterCollection(
      collection.getCollectionByName(collectionName));

    // Count the number of dividers
    var numDividers = client.findElements(selectors.allDividers).length;

    assert.equal(numDividers, 1, 'there is one divider at the end');

    // Pin an application
    var firstIcon = client.findElement(selectors.firstWebResultNoPinned);
    actions.longPress(firstIcon, 1).perform();
    client.helper.waitForElement(selectors.cloudMenuPin).click();

    // Wait until a new section is created.
    client.waitFor(function() {
      var currentDividers = client.findElements(selectors.allDividers).length;
      return currentDividers === numDividers + 1;
    });

    // Compare the position of the first pinned icon to the first web result.
    // The pinned icon should be higher than the web result.
    var firstWebPosition = client.findElement(selectors.firstWebResultPinned)
      .location();
    var firstPinnedPosition = client.findElement(selectors.firstPinnedResult)
      .location();
    assert.equal(firstWebPosition.x, firstPinnedPosition.x,
      'items are on the same x-axis');
    assert.ok(firstWebPosition.y > firstPinnedPosition.y,
      'the web result is below the pinned item');
  });

});
