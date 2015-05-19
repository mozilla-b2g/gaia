'use strict';

var assert = require('assert');
var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var collection, home, selectors, server, system;

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
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);
  });

  test('collection name localization', function() {
    var collectionName = 'Entertainment';
    collection.enterCreateScreen();
    collection.selectNew([collectionName]);
    client.apps.switchToApp(home.URL);

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
      '/locales-obj/index.qps-ploc.json',
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
