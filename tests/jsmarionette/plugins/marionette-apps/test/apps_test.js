'use strict';
var Apps = require('../lib/apps');
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
});
