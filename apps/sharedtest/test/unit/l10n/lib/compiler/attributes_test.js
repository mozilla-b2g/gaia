/* global it, before, beforeEach, assert:true, describe, requireApp */
'use strict';
var compile, assert;

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/compiler/header.js');
} else {
  compile = require('./header.js').compile;
  assert = require('./header.js').assert;
}


describe('Attributes', function(){
  var source, env;

  beforeEach(function() {
    env = compile(source);
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
      var entity = env.foo.valueOf();
      assert.strictEqual(entity.attributes.attr, 'An attribute');
    });

    it('returns the value with a placeable', function(){
      var entity = env.foo.valueOf();
      assert.strictEqual(entity.attributes.attrComplex,
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
      var value = env.update.toString();
      assert.strictEqual(value, 'Update');
    });

    it('returns the value of the attribute\'s member', function(){
      var entity = env.update.valueOf({n: 1});
      assert.strictEqual(entity.attributes.innerHTML, 'One update available');
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
      var entity = env.update.valueOf({n: 1, k: 2});
      assert.strictEqual(entity.value, 'One update');
    });

    it('returns the value of the attribute', function(){
      var entity = env.update.valueOf({n: 1, k: 2});
      assert.strictEqual(entity.attributes.innerHTML, '2 updates innerHTML');
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
      var entity = env.brandName.valueOf();
      assert.strictEqual(entity.value, 'Firefox');
    });

    it('returns the value of the attribute', function(){
      var entity = env.brandName.valueOf();
      assert.strictEqual(entity.attributes.title, 'Mozilla Firefox');
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
      var entity = env.brandName.valueOf();
      assert.strictEqual(entity.attributes.title,
                         'Mozilla {{ brandName.title }}');
    });

  });

});
