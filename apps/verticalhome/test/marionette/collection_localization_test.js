'use strict';

var assert = require('assert');
var Collection = require('./lib/collection');
var EmeServer = require('./eme_server/parent');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection', function() {

  var client = marionette.client(Home2.clientOptions);
  var collection, home, selectors, server, system;

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

    /*
    // XXX: Loading this locale file seems to no longer work.
    // Hardcode the expected value for now.
    var expected = home.l10n(
      '/locales-obj/qps-ploc.json',
      // XXX: harcoded number 376 taken from the fixture
      'collection-categoryId-376'
    );
    */
    var expected = 'Ḗḗƞŧḗḗřŧȧȧīīƞḿḗḗƞŧ'; // Entertainment
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
});
