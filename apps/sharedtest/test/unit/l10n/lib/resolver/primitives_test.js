/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header.js').Resolver;
  var createEntries = require('./header.js').createEntries;
}

describe('Primitives:', function(){
  var source, env;
  beforeEach(function() {
    env = createEntries(source);
  });

  describe('Simple string value', function(){

    before(function() {
      source = [
        'foo=Foo'
      ].join('\n');
    });

    it('returns the value', function(){
      assert.strictEqual(Resolver.formatValue(env.foo), 'Foo');
    });

  });

  describe('Complex string value', function(){

    before(function() {
      source = [
        'foo=Foo',
        'bar={{ foo }} Bar',
        'baz={{ missing }}',
        'qux={{ malformed }'
      ].join('\n');
    });

    it('returns the value', function(){
      var value = Resolver.formatValue(env.bar);
      assert.strictEqual(value, 'Foo Bar');
    });

    it('returns the raw string if the referenced entity is ' +
       'not found', function(){
      var value = Resolver.formatValue(env.baz);
      assert.strictEqual(value, '{{ missing }}');
    });

  });

  describe('Complex string referencing an entity with null value', function(){

    before(function() {
      source = [
        'foo.attr=Foo',
        'bar={{ foo }} Bar',
      ].join('\n');
    });

    it('returns the null value', function(){
      var entity = Resolver.formatEntity(env.foo);
      assert.strictEqual(entity.value, null);
    });

    it('returns the attribute', function(){
      var entity = Resolver.formatEntity(env.foo);
      assert.strictEqual(entity.attrs.attr, 'Foo');
    });

    it('returns the raw string when the referenced entity has ' +
       'null value', function(){
      var value = Resolver.formatValue(env.bar);
      assert.strictEqual(value, '{{ foo }} Bar');
    });

  });

  describe('Cyclic reference', function(){

    before(function() {
      source = [
        'foo={{ bar }}',
        'bar={{ foo }}'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.formatValue(env.foo);
      assert.strictEqual(value, '{{ foo }}');
    });

  });

  describe('Cyclic self-reference', function(){

    before(function() {
      source = [
        'foo={{ foo }}'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.formatValue(env.foo);
      assert.strictEqual(value, '{{ foo }}');
    });

  });

  describe('Cyclic self-reference in a hash', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[one]={{ foo }}',
        'foo[two]=Bar',
        'bar={{ foo }}'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.formatValue(env.foo, {n: 1});
      assert.strictEqual(value, '{{ foo }}');
    });

    it('returns the valid value if requested directly', function(){
      var value = Resolver.formatValue(env.bar, {n: 2});
      assert.strictEqual(value, 'Bar');
    });
  });

});
