'use strict';
/* global __dirname */

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Collection = require('./lib/collection');
var Home2 = require('./lib/home2');
var EmeServer = require('./eme_server/parent');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Uninstall Collection', function() {

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

  var icon;
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


    var name = 'Around Me';
    collection.enterCreateScreen();
    collection.selectNew([name]);
    client.apps.switchToApp(Home2.URL);
    icon = collection.getCollectionByName(name);
  });

  test('uninstall collection', function() {
    home.enterEditMode();

    var remove = icon.findElement('.remove');
    var id = icon.scriptWith(function(el) {
      return el.dataset.identifier;
    });

    remove.click();
    home.confirmDialog('remove');

    // ensure the icon disappears
    client.helper.waitForElementToDisappear(icon);

    home.restart();

    // ensure collection is gone after restart
    var allIconIds = home.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(id) === -1, 'collection was removed');
  });
});
