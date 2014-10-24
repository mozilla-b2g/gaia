/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header.js').Resolver;
  var createEntries = require('./header.js').createEntries;
}

describe('Index', function(){
  var source, env;

  beforeEach(function() {
    env = createEntries(source);
  });

  describe('Different values of index', function(){

    before(function() {
      source = [
        'foo=one',
        'indexEntity={[ foo ]}',
        'indexEntity[one]=One entity',
        'indexUncalledMacro={[ plural ]}',
        'indexUncalledMacro[one]=One uncalled macro',
        'indexCalledMacro={[ plural(n) ]}',
        'indexCalledMacro[one]=One called macro',
      ].join('\n');
    });

    it('works when the index is a regular entity', function() {
      var value = Resolver.formatValue(env.indexEntity, {n: 1});
      assert.strictEqual(value, 'One entity');
    });
    it('throws when the index is an uncalled macro (resolve)', function() {
      assert.throws(function() {
        Resolver.format(env.indexUncalledMacro, {n: 1});
      }, 'Macro plural expects 1 argument(s), yet 0 given');
    });
    it('returns undefined when the index is an uncalled macro (toString)',
      function() {
      var value = Resolver.formatValue(env.indexUncalledMacro, {n: 1});
      assert.strictEqual(value, undefined);
    });
    it('works when the index is a called macro', function() {
      var value = Resolver.formatValue(env.indexCalledMacro, {n: 1});
      assert.strictEqual(value, 'One called macro');
    });

  });

  describe('Cyclic reference to the same entity', function(){

    before(function() {
      source = [
        'foo={[ plural(foo) ]}',
        'foo[one]=One'
      ].join('\n');
    });

    it('is undefined', function() {
      var value = Resolver.formatValue(env.foo);
      assert.strictEqual(value, undefined);
    });

  });

  describe('Reference from an attribute to the value of the same ' +
           'entity', function(){

    before(function() {
      source = [
        'foo=Foo',
        'foo.attr={[ plural(foo) ]}',
        'foo.attr[one]=One'
      ].join('\n');
    });

    it('value of the attribute is undefined', function() {
      var entity = Resolver.formatEntity(env.foo);
      assert.strictEqual(entity.value, 'Foo');
      assert.strictEqual(entity.attrs.attr, undefined);
    });

  });

});
