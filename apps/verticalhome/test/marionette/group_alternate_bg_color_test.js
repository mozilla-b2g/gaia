'use strict';

var Actions = require('marionette-client').Actions;
var assert = require('assert');

var Home2 = require('./lib/home2');

marionette('Vertical - Group', function() {

  var client = marionette.client(Home2.clientOptionsWithGroups);
  var actions, home, system;

  setup(function() {
    actions = new Actions(client);
    home = new Home2(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    client.apps.launch(Home2.URL);
    home.waitForLaunch();
  });

  test('check that group backgrounds alternate', function() {
    var groupSelector = '#icons .group';
    var oddGroupSelector = '#icons .group.odd';

    // Now get groups and make sure they alternate
    var groups = client.findElements(groupSelector);
    var oddGroups = client.findElements(oddGroupSelector);

    assert.ok(groups.length >= 3);
    assert.equal(oddGroups.length, Math.floor(groups.length / 2));

    for (var i = 0, iLen = groups.length; i < iLen; i++) {
      var isOdd = groups[i].getAttribute('className').indexOf('odd') !== -1;
      if ((i % 2) === 1) {
        assert.ok(isOdd);
      } else {
        assert.ok(!isOdd);
      }
    }
  });
});
