'use strict';

var Actions = require('marionette-client').Actions;
var assert = require('assert');

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Edit Mode -> Editing group', function() {

  var client = marionette.client(Home2.clientOptionsWithGroups);
  var actions, home, system, selectors;
  var name = 'xxx';

  setup(function() {
    selectors = Home2.Selectors;

    actions = new Actions(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    client.apps.launch(Home2.URL);

    home.waitForLaunch();
    home.enterEditMode();
  });

  function setName(name) {
    client.findElement(selectors.groupHeader).tap();
    client.helper.waitForElement(selectors.editGroup);
    client.findElement(selectors.editGroupTitle).sendKeys(name);
    client.findElement(selectors.editGroupSave).click();
  }

  test('Naming the first group', function() {
    setName(name);
    assert.equal(client.findElement(selectors.groupTitle).text(), name);
  });

});
