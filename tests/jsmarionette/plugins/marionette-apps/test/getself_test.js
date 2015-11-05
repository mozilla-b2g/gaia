'use strict';

/* global marionette, setup */

var assert = require('assert');

marionette('getself', function() {
  var getSelf = require('../lib/getself').getSelf;

  marionette.plugin('mozApps', require('../lib/apps'));
  var client = marionette.client();

  var origins = {
    system: 'app://system.gaiamobile.org',
    calendar: 'app://calendar.gaiamobile.org'
  };

  function testCurrentApp(origin) {
    test('current app self', function(done) {
      getSelf(client.mozApps, function(err, app) {
        assert.equal(app.origin, origins[origin], origin + ' origin');
        done();
      });
    });
  }

  testCurrentApp('system');

  suite('switch app', function() {
    setup(function(done) {
      if (client.isSync) {
        client.apps.launch(origins.calendar);
        client.apps.switchToApp(origins.calendar);
        done();
      } else {
        client.apps.launch(origins.calendar, function() {
          client.apps.switchToApp(origins.calendar, done);
        });
      }
    });

    testCurrentApp('calendar');
  });
});
