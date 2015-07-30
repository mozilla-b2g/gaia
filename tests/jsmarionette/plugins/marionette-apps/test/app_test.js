'use strict';
var assert = require('assert');

marionette('App', function() {
  var subject;
  var client = marionette.client();

  marionette.plugin('mozApps', require('../lib/apps'));

  suite('#launch', function() {
    var context;

    var CALENDAR_URL = 'app://calendar.gaiamobile.org';
    setup(function(done) {
      client.mozApps.mgmt.getAll(function(err, result) {
        if (err) {
          return done(err);
        }

        for (var i = 0; i < result.length; i++) {
          var app = result[i];
          if (app.origin === CALENDAR_URL) {
            subject = app;
            context = client.context;
            subject.launch();
            done();
          }
        }
      });
    });

    test('should launch the appropriate app', function(done) {
      /**
       * @param {string} app src for app.
       */
      function checkForApp(app) {
        var selector = 'iframe[src="' + app + '"]';

        if (client.isSync) {
          client.setSearchTimeout(10000);
          var result = client.findElement(selector);
          assert.notEqual(result.id, undefined);
          done();
        } else {
          client
            .setSearchTimeout(10000)
            .findElement(selector, function(err, result) {
              assert.notEqual(result.id, undefined);
              done();
            });
        }
      }

      if (client.context !== 'content') {
        client.setContext('content');
      }
      checkForApp(CALENDAR_URL + '/index.html');
    });

    test('should not change client context', function() {
      assert.strictEqual(client.context, context);
    });
  });
});
