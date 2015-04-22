'use strict';

var assert = require('assert');
var Collection = require('../lib/collection');
var Home = require('../lib/verticalhome');
var EmeServer = require(
  '../../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Collection Browser', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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

  test('launching a collection disables edit mode', function() {
    collection.enterCreateScreen(1);

    // A collection name from the cateories_list.json stub
    var collectionName = 'Around Me';
    collection.selectNew(collectionName);
    client.apps.switchToApp(home.URL);

    var collectionIcon = collection.getCollectionByName(collectionName);

    // Tap, then quickly long-press the collection icon
    actions
      .tap(collectionIcon)
      .press(collectionIcon)
      .wait(2)
      .release()
      .perform();

    // Verify the homescreen isn't in edit mode
    assert.ok(!home.containsClass(Home.Selectors.grid, 'edit-mode'));
  });
});
