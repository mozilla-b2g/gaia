'use strict';
var assert = require('assert');

// Global plugin
marionette.plugin('globalme', function() {
  return { isGlobal: true };
});

marionette('plugins', function() {
  function PluginA(client, options) {
    return PluginA;
  }

  var pluginId = 0;
  function PluginB(client, options) {
    return { id: ++pluginId };
  }

  // create global plugin
  marionette.plugin('a', PluginA);
  marionette.plugin('b', PluginB);

  var client = marionette.client();

  test('global plugin is exposed', function() {
    assert(client.globalme.isGlobal);
  });

  test('a is exposed', function() {
    assert.strictEqual(client.a, PluginA);
  });

  test('plugins are created for each test', function() {
    assert.equal(client.b.id, 3);
  });

  suite('overrides plugin a', function() {
    function MyA() { return MyA; }

    marionette.plugin('a', MyA);

    test('can override plugins', function() {
      assert.strictEqual(client.a, MyA);
    });
  });

  suite('a is reset after suite to original', function() {
    test('after other suite', function() {
      assert.deepEqual(client.a, PluginA);
    });

    test('b is still plugin b', function() {
      assert.equal(client.b.id, 6);
    });
  });
});
