'use strict';

var assert = require('assert');
var Collection = require('../lib/collection');
var EmeServer = require(
  '../../../../../shared/test/integration/eme_server/parent');

marionette('Vertical - Uninstall Collection', function() {

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

  var icon;
  setup(function() {
    actions = client.loader.getActions();
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    home.waitForLaunch();
    EmeServer.setServerURL(client, server);

    var name = 'Around Me';
    collection.enterCreateScreen();
    collection.selectNew([name]);
    client.apps.switchToApp(home.URL);
    icon = collection.getCollectionByName(name);
  });

  test('uninstall collection', function() {
    home.enterEditMode();

    var remove;
    client.waitFor(function() {
      remove = icon.findElement('.remove');
      return remove && remove.displayed();
    });

    var id = icon.scriptWith(function(el) {
      return el.dataset.identifier;
    });

    remove.tap();
    home.confirmDialog('remove');

    // ensure the icon disappears
    client.helper.waitForElementToDisappear(icon);

    home.restart();

    // ensure collection is gone after restart
    var allIconIds = home.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(id) === -1, 'collection was removed');
  });
});
