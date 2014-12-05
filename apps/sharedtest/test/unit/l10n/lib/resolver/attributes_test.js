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
      var attr = Resolver.format(null, env.foo.attrs.attr);
      assert.strictEqual(attr, 'An attribute');
    });

    it('returns the value with a placeable', function(){
      var attr = Resolver.format(null, env.foo.attrs.attrComplex);
      assert.strictEqual(attr, 'An attribute referencing Bar');
    });

  });

  describe('with hash values', function(){

    before(function() {
      source = [
        'update=Update',
        'update.innerHTML={[ plural(n) ]}',
        'update.innerHTML[one]=One update available'
      ].join('\n');
    });

    it('returns the value of the entity', function(){
      var value = Resolver.format(null, env.update);
      assert.strictEqual(value, 'Update');
    });

    it('returns the value of the attribute\'s member', function(){
      var attr = Resolver.format({n: 1}, env.update.attrs.innerHTML);
      assert.strictEqual(attr, 'One update available');
    });

  });


  describe('with hash values, on entities with hash values ', function(){

    before(function() {
      source = [
        'update={[ plural(n) ]}',
        'update[one]=One update',
        'update[other]={{ n }} updates',
        'update.innerHTML={[ plural(k) ]}',
        'update.innerHTML[one]=One update innerHTML',
        'update.innerHTML[other]={{ k }} updates innerHTML'
      ].join('\n');
    });

    it('returns the value of the entity', function(){
      var value = Resolver.format({n: 1, k: 2}, env.update);
      assert.strictEqual(value, 'One update');
    });

    it('returns the value of the attribute', function(){
      var attr = Resolver.format({n: 1, k: 2}, env.update.attrs.innerHTML);
      assert.strictEqual(attr, '2 updates innerHTML');
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
      var value = Resolver.format(null, env.brandName);
      assert.strictEqual(value, 'Firefox');
    });

    it('returns the value of the attribute', function(){
      var attr = Resolver.format(null, env.brandName.attrs.title);
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
      var attr = Resolver.format(null, env.brandName.attrs.title);
      assert.strictEqual(attr, 'Mozilla {{ brandName.title }}');
    });

  });

});
