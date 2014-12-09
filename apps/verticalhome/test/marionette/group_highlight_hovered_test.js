'use strict';

var Actions = require('marionette-client').Actions;
var assert = require('assert');

marionette('Vertical - Group', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system;

  setup(function() {
    actions = new Actions(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    client.apps.launch(home.URL);
    home.waitForLaunch();
  });

  test('check that group backgrounds highlight when hovered over', function() {
    var groupSelector = '#icons .group';

    // Store the metrics of the first icon before collapsing
    var icon = client.helper.waitForElement(home.Selectors.firstIcon);

    // Long press on the icon and don't let go so we can see the styling of
    // the group underneath it
    actions.press(icon).wait(1).perform();

    // Check that it has the styling that would highlight its background
    var group = client.findElement(groupSelector);
    assert.ok(group.getAttribute('className').indexOf('drop-target') !== -1);

    // Make sure the highlight is removed after releasing
    actions.release().wait(1).perform();
    assert.ok(group.getAttribute('className').indexOf('drop-target') === -1);
  });
});
