'use strict';
var assert = require('assert');
var fs = require('fs');

marionette('ObjectCache', function() {
  var ObjectCache, script, window;

  setup(function() {
    var filename = __dirname + '/../lib/scripts/objectcache.js';
    script = fs.readFileSync(filename, 'utf8');
    window = {
      wrappedJSObject: {}
    };

    eval(script);

    ObjectCache = window.wrappedJSObject.ObjectCache;
  });

  suite('load', function() {
    test('should define ObjectCache', function() {
      assert.notEqual(ObjectCache, undefined);
    });

    test('should make an ObjectCache', function() {
      assert.deepEqual(ObjectCache._inst._cache, {});
      assert.strictEqual(ObjectCache._inst._nextId, 0);
    });
  });

  suite('#get', function() {
    var one, two, three;

    setup(function() {
      one = { fish: 'blue' };
      two = { fish: 'red' };
      three = {
        dog: 'linus',
        human: 'alison',
        parrot: 'harvey',
        number: 3
      };

      ObjectCache._inst._cache = {
        '1': one,
        '2': two,
        '3': three
      };
    });

    test('should read things from the internal _cache', function() {
      assert.deepEqual(ObjectCache._inst.get('1'), one);
      assert.deepEqual(ObjectCache._inst.get('2'), two);
      assert.deepEqual(ObjectCache._inst.get('3'), three);
    });
  });

  suite('#set', function() {
    var bweop, resultWithKey, resultWithoutKey;

    setup(function() {
      bweop = { fish: 'blue' };
      resultWithKey = ObjectCache._inst.set(bweop, 'bweop');
      resultWithoutKey = ObjectCache._inst.set(bweop);
    });

    test('should write things to the internal _cache', function() {
      assert.deepEqual(ObjectCache._inst._cache.bweop, bweop);
      assert.deepEqual(ObjectCache._inst._cache['1'], bweop);
    });

    test('should take key if provided', function() {
      assert.deepEqual(resultWithKey, 'bweop');
    });

    test('should generate a new key when no key is provided', function() {
      assert.strictEqual(resultWithoutKey, '1');
    });
  });

  suite('#getNextId', function() {
    var result;

    setup(function() {
      ObjectCache._inst._nextId = 5;
      result = ObjectCache._inst.getNextId();
    });

    test('should return a string equal to previous nextId + 1', function() {
      assert.strictEqual(result, '6');
    });

    test('should update internal count', function() {
      assert.strictEqual(ObjectCache._inst._nextId, 6);
    });
  });
});
