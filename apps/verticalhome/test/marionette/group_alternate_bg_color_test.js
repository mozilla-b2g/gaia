'use strict';

var assert = require('assert');

marionette('Vertical - Group', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    client.apps.launch(home.URL);
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
