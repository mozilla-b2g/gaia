/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header').Resolver;
  var createEntries = require('./header').createEntries;
}

describe('L10n Resolver overlay', function(){
  var source, env;

  beforeEach(function() {
    env = createEntries(source);
  });

  describe('simple values and attributes', function(){

    before(function() {
      source = [
        'foo=Foo',
        'foo.attr=An attribute',
        'bar=Bar <a>',
        'bar.attr=An attribute <a>',
        'baz={[plural(n)]}',
        'baz[one]=Baz <a>',
        'baz.attr={[plural(n)]}',
        'baz.attr[one]=An attribute <a>',
      ].join('\n');
    });

    it('detects no overlay in simple value', function(){
      var formatted = Resolver.format(null, env.foo);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'Foo');
    });

    it('detects no overlay in simple attribute', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attr);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'An attribute');
    });

    it('detects overlay in simple value', function(){
      var formatted = Resolver.format(null, env.bar);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Bar <a>');
    });

    it('detects overlay in simple attribute', function(){
      var formatted = Resolver.format(null, env.bar.attrs.attr);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'An attribute <a>');
    });

    it('detects overlay in simple hash value', function(){
      var formatted = Resolver.format({n: 1}, env.baz);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Baz <a>');
    });

    it('detects overlay in simple hash attribute', function(){
      var formatted = Resolver.format({n: 1}, env.baz.attrs.attr);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'An attribute <a>');
    });

  });

  describe('complex values', function(){

    before(function() {
      source = [
        'foo0=Foo {{ bar }}',
        'foo1=Foo {{ bar }} <a>',
        'foo2=Foo {{ baz }}',
        'foo3=Foo {{ baz }} <a>',
        'bar=Bar',
        'baz=Baz <a>',
        'hash1={[plural(n)]}',
        'hash1[one]=Foo {{ bar }} <a>',
        'hash2={[plural(n)]}',
        'hash2[one]=Foo {{ baz }}',
        'hash3={[plural(n)]}',
        'hash3[one]=Foo {{ baz }} <a>',
      ].join('\n');
    });

    it('detects no overlay in a complex value', function(){
      var formatted = Resolver.format(null, env.foo0);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'Foo Bar');
    });

    it('detects overlay in a complex value', function(){
      var formatted = Resolver.format(null, env.foo1);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Bar <a>');
    });

    it('detects overlay in a placable', function(){
      var formatted = Resolver.format(null, env.foo2);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a>');
    });

    it('detects overlay in a placable and in value', function(){
      var formatted = Resolver.format(null, env.foo3);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a> <a>');
    });

    it('detects overlay in a complex hash value', function(){
      var formatted = Resolver.format({n: 1}, env.hash1);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Bar <a>');
    });

    it('detects overlay in a placable in a hash value', function(){
      var formatted = Resolver.format({n: 1}, env.hash2);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a>');
    });

    it('detects overlay in a placable and in hash value', function(){
      var formatted = Resolver.format({n: 1}, env.hash3);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a> <a>');
    });

  });

  describe('complex attributes', function(){

    before(function() {
      source = [
        'foo.attr0=Foo {{ bar }}',
        'foo.attr1=Foo {{ bar }} <a>',
        'foo.attr2=Foo {{ baz }}',
        'foo.attr3=Foo {{ baz }} <a>',
        'bar=Bar',
        'baz=Baz <a>',
        'foo.hashAttr1={[plural(n)]}',
        'foo.hashAttr1[one]=Foo {{ bar }} <a>',
        'foo.hashAttr2={[plural(n)]}',
        'foo.hashAttr2[one]=Foo {{ baz }}',
        'foo.hashAttr3={[plural(n)]}',
        'foo.hashAttr3[one]=Foo {{ baz }} <a>',
      ].join('\n');
    });

    it('detects no overlay in a complex attribute', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attr0);
      assert.strictEqual(formatted[0].overlay, false);
      assert.strictEqual(formatted[1], 'Foo Bar');
    });

    it('detects overlay in a complex attribute', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attr1);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Bar <a>');
    });

    it('detects overlay in a placable', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attr2);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a>');
    });

    it('detects overlay in a placable and in attribute', function(){
      var formatted = Resolver.format(null, env.foo.attrs.attr3);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a> <a>');
    });

    it('detects overlay in a complex hash attribute', function(){
      var formatted = Resolver.format({n: 1}, env.foo.attrs.hashAttr1);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Bar <a>');
    });

    it('detects overlay in a placable in a hash attribute', function(){
      var formatted = Resolver.format({n: 1}, env.foo.attrs.hashAttr2);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a>');
    });

    it('detects overlay in a placable and in hash attribute', function(){
      var formatted = Resolver.format({n: 1}, env.foo.attrs.hashAttr3);
      assert.strictEqual(formatted[0].overlay, true);
      assert.strictEqual(formatted[1], 'Foo Baz <a> <a>');
    });

  });

});
