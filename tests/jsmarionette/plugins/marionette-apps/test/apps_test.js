'use strict';

/* global marionette */

var Apps = require('../lib/apps');
var App = require('../lib/app');
var assert = require('assert');

marionette('Apps', function() {
  var client = marionette.client();

  marionette.plugin('mozApps', require('../lib/apps'));

  suite('#setup', function() {
    test('should return an App with a _client', function() {
      assert.ok(client.mozApps instanceof Apps);
      assert.strictEqual(client.mozApps._client, client);
    });
  });

  suite('#getSelf', function() {
    test('should return a current app', function(done) {
      client.mozApps.getSelf(function(err, app) {
        if (err) {
          return done(err);
        }
        assert.ok(app instanceof App, 'app instanceof App');
        done();
      });
    });
  });
});
