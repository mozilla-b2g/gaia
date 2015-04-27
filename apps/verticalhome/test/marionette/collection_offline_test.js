'use strict';

var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);
  });

  // Refer to http://bugzil.la/1061457.
  test.skip('create collection shows offline message if no server response',
    function() {

    server.failAll();
    collection.enterCreateScreen();

    client.switchToFrame();
    client.apps.switchToApp(Collection.URL);
    server.unfailAll();

    var expectedMsg = home.l10n(
      '/locales-obj/index.en-US.json',
      'network-error-message'
    );

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

  // Refer to http://bugzil.la/1061458.
  test.skip('create collection offline succeeds if response is cached',
    function() {
      var name1 = 'Around Me';
      var name2 = 'Astrology';

      // create a collection. expect it will cache the response
      collection.enterCreateScreen();
      collection.selectNew(name1);
      client.apps.switchToApp(home.URL);
      collection.getCollectionByName(name1);

      // go offline, expect list to be retrieved from cache
      server.failAll();

      collection.enterCreateScreen();
      collection.selectNew(name2);
      client.apps.switchToApp(home.URL);
      collection.getCollectionByName(name2);

      server.unfailAll();
  });

});
