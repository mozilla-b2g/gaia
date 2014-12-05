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
      var value = Resolver.format({n: 1}, env.indexEntity);
      assert.strictEqual(value, 'One entity');
    });
    it('throws when the index is an uncalled macro', function() {
      assert.throws(function() {
        Resolver.format({n: 1}, env.indexUncalledMacro);
      }, 'Macro plural expects 1 argument(s), yet 0 given');
    });
    it('works when the index is a called macro', function() {
      var value = Resolver.format({n: 1}, env.indexCalledMacro);
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
      assert.throws(function() {
        Resolver.format(null, env.foo);
      }, 'Cyclic reference detected: foo');
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
      assert.strictEqual(Resolver.format(null, env.foo), 'Foo');
      assert.throws(function() {
        Resolver.format(null, env.foo.attrs.attr);
      }, 'Unresolvable value');
    });

  });

});
