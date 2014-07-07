'use strict';

var Actions = require('marionette-client').Actions;

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Edit Mode', function() {

  var client = marionette.client(Home2.clientOptions);
  var actions, home, system;
  var selectors;

  setup(function() {
    selectors = Home2.Selectors;

    actions = new Actions(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    client.apps.launch(Home2.URL);

    home.waitForLaunch();
  });

  test('Exit edit mode using done button', function() {
    home.enterEditMode();
    var header = client.findElement(selectors.editHeaderText);
    var done = client.helper.waitForElement(selectors.editHeaderDone);
    done.click();
    client.helper.waitForElementToDisappear(header);
  });

});
