/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header').Resolver;
  var createEntries = require('./header').createEntries;
}

describe('Attributes', function(){
  var source, env;

  beforeEach(function() {
    env = createEntries(source);
  });

  describe('with string values', function(){

    before(function() {
      source = [
        'foo=Foo',
        'foo.attr=An attribute',
        'foo.attrComplex=An attribute referencing {{ bar }}',
        'bar=Bar'
      ].join('\n');
    });

    it('returns the value', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attr);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'An attribute');
    });

    it('returns the value with a placeable', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attrComplex);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'An attribute referencing Bar');
    });

  });

  describe('with hash values', function(){

    before(function() {
      source = [
        'update=Update',
        'update.title={[ plural(n) ]}',
        'update.title[one]=One update available'
      ].join('\n');
    });

    it('returns the value of the entity', function(){
      var formatted = Resolver.format(null, env.update);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'Update');
    });

    it('returns the value of the attribute\'s member', function(){
      var formatted = Resolver.format({n: 1}, env.update.attrs.title);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'One update available');
    });

  });


  describe('with hash values, on entities with hash values ', function(){

    before(function() {
      source = [
        'update={[ plural(n) ]}',
        'update[one]=One update',
        'update[other]={{ n }} updates',
        'update.title={[ plural(k) ]}',
        'update.title[one]=One update title',
        'update.title[other]={{ k }} updates title'
      ].join('\n');
    });

    it('returns the value of the entity', function(){
      var formatted = Resolver.format({n: 1, k: 2}, env.update);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'One update');
    });

    it('returns the value of the attribute', function(){
      var formatted = Resolver.format({n: 1, k: 2}, env.update.attrs.title);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], '2 updates title');
    });

  });

  describe('with relative self-references', function(){

    before(function() {
      source = [
        'brandName=Firefox',
        'brandName.title=Mozilla {{ brandName }}'
      ].join('\n');
    });

    it('returns the value of the entity', function(){
      var value = Resolver.format(null, env.brandName)[1];
      assert.strictEqual(value, 'Firefox');
    });

    it('returns the value of the attribute', function(){
      var attr = Resolver.format(null, env.brandName.attrs.title)[1];
      assert.strictEqual(attr, 'Mozilla Firefox');
    });

  });

  describe('with cyclic self-references', function(){

    before(function() {
      source = [
        'brandName=Firefox',
        'brandName.title=Mozilla {{ brandName.title }}'
      ].join('\n');
    });

    it('returns the raw string of the attribute', function(){
      var attr = Resolver.format(null, env.brandName.attrs.title)[1];
      assert.strictEqual(attr, 'Mozilla {{ brandName.title }}');
    });

  });

});
