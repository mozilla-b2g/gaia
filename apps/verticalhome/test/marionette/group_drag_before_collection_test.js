'use strict';

var Collection = require('./lib/collection');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var assert = require('assert');

marionette('Vertical - Group', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system, collection, server;

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
    collection = new Collection(client);
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();
    EmeServer.setServerURL(client, server);
  });

  test('create new group above collection', function() {
    // Get the current first icon, which we'll be dragging above the
    // newly created collection.
    var icon = client.helper.waitForElement(home.Selectors.firstIcon);

    // Create a new collection and switch back to home screen
    collection.enterCreateScreen();
    collection.selectNew(['Around Me']);
    client.apps.switchToApp(home.URL);

    // Get a reference to the newly added collection
    var collectionIcon = client.findElements(home.Selectors.collections).pop();

    // Move it to the top
    home.moveIconToIndex(collectionIcon, 0);

    // Count the number of groups
    var nGroups = home.numDividers;

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(home.Selectors.editHeaderText);

    // Drag icon to the header to try and create a new group at the top
    actions.press(icon).wait(1).move(header).release().perform();
    client.helper.waitForElement(home.Selectors.editHeaderDone).click();

    // Make sure that a new group was created
    assert.equal(home.numDividers, nGroups + 1);
  });
});
