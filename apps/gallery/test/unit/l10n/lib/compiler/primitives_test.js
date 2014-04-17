/* global it, before, beforeEach, assert:true, describe */
/* global window, navigator, process */
'use strict';

var assert = require('assert') || window.assert;

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
} else {
  var L10n = {
    parse: require('../../../lib/l20n/parser').parse,
    compile: process.env.L20N_COV ?
      require('../../../build/cov/lib/l20n/compiler').compile :
      require('../../../lib/l20n/compiler').compile,
    getPluralRule: require('../../../lib/l20n/plurals').getPluralRule
  };
}

function compile(source) {
  var ast = L10n.parse(null, source);
  var env = L10n.compile(null, ast);
  env.__plural = L10n.getPluralRule('en-US');
  return env;
}

describe('Primitives:', function(){
  var source, env;
  beforeEach(function() {
    env = compile(source);
  });

  describe('Simple string value', function(){

    before(function() {
      source = [
        'foo=Foo'
      ].join('\n');
    });

    it('returns the value', function(){
      assert.strictEqual(env.foo.toString(), 'Foo');
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
      var value = env.bar.toString();
      assert.strictEqual(value, 'Foo Bar');
    });

    it('returns the raw string if the referenced entity is ' +
       'not found', function(){
      var value = env.baz.toString();
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
      var entity = env.foo.valueOf();
      assert.strictEqual(entity.value, null);
    });

    it('returns the attribute', function(){
      var entity = env.foo.valueOf();
      assert.strictEqual(entity.attributes.attr, 'Foo');
    });

    it('returns the raw string when the referenced entity has ' +
       'null value', function(){
      var value = env.bar.toString();
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
      var value = env.foo.toString();
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
      var value = env.foo.toString();
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
      var value = env.foo.toString({n: 1});
      assert.strictEqual(value, '{{ foo }}');
    });

    it('returns the valid value if requested directly', function(){
      var value = env.bar.toString({n: 2});
      assert.strictEqual(value, 'Bar');
    });
  });

});
