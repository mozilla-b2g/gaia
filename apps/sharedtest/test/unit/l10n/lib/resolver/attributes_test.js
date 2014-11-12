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
      var entity = Resolver.formatEntity(env.foo);
      assert.strictEqual(entity.attrs.attr, 'An attribute');
    });

    it('returns the value with a placeable', function(){
      var entity = Resolver.formatEntity(env.foo);
      assert.strictEqual(entity.attrs.attrComplex,
                         'An attribute referencing Bar');
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
      var value = Resolver.formatValue(env.update);
      assert.strictEqual(value, 'Update');
    });

    it('returns the value of the attribute\'s member', function(){
      var entity = Resolver.formatEntity(env.update, {n: 1});
      assert.strictEqual(entity.attrs.innerHTML, 'One update available');
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
      var entity = Resolver.formatEntity(env.update, {n: 1, k: 2});
      assert.strictEqual(entity.value, 'One update');
    });

    it('returns the value of the attribute', function(){
      var entity = Resolver.formatEntity(env.update, {n: 1, k: 2});
      assert.strictEqual(entity.attrs.innerHTML, '2 updates innerHTML');
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
      var entity = Resolver.formatEntity(env.brandName);
      assert.strictEqual(entity.value, 'Firefox');
    });

    it('returns the value of the attribute', function(){
      var entity = Resolver.formatEntity(env.brandName);
      assert.strictEqual(entity.attrs.title, 'Mozilla Firefox');
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
      var entity = Resolver.formatEntity(env.brandName);
      assert.strictEqual(entity.attrs.title,
                         'Mozilla {{ brandName.title }}');
    });

  });

});
