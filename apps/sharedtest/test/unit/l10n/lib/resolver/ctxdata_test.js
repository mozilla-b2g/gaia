/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header').Resolver;
  var createEntries = require('./header').createEntries;
}

describe('Context data', function(){
  var source, ctxdata, env;

  beforeEach(function() {
    env = createEntries(source);
  });

  describe('in entities', function(){

    before(function() {
      ctxdata = {
        unreadNotifications: 3,
        foo: 'Foo'
      };
      source = [
        'unread=Unread notifications: {{ unreadNotifications }}',
        'unreadPlural={[ plural(unreadNotifications) ]}',
        'unreadPlural[one]=One unread notification',
        'unreadPlural[other]={{ unreadNotifications}} unread notifications',
        'foo=Bar',
        'useFoo={{ foo }}'
      ].join('\n');
    });

    it('can be referenced from strings', function() {
      var value = Resolver.format(ctxdata, env.unread);
      assert.strictEqual(value, 'Unread notifications: 3');
    });

    it('can be passed as argument to a macro', function() {
      var value = Resolver.format(ctxdata, env.unreadPlural);
      assert.strictEqual(value, '3 unread notifications');
    });

    it('takes priority over entities of the same name', function() {
      var value = Resolver.format(ctxdata, env.useFoo);
      assert.strictEqual(value, 'Foo');
    });

  });

  describe('and simple errors', function(){

    before(function() {
      ctxdata = {
        nested: {
        }
      };
      source = [
        'missingReference={{ missing }}',
        'nestedReference={{ nested }}',
        'watchReference={{ watch }}',
        'hasOwnPropertyReference={{ hasOwnProperty }}',
        'isPrototypeOfReference={{ isPrototypeOf }}',
        'toStringReference={{ toString }}',
        'protoReference={{ __proto__ }}',
      ].join('\n');
    });

    it('returns the raw string when a missing property of ctxdata is ' +
       'referenced', function(){
      var value = Resolver.format(ctxdata, env.missingReference);
      assert.strictEqual(value, '{{ missing }}');
    });

    it('returns the raw string when an object is referenced', function(){
      var value = Resolver.format(ctxdata, env.nestedReference);
      assert.strictEqual(value, '{{ nested }}');
    });

    it('returns the raw string when watch is referenced', function(){
      var value = Resolver.format(ctxdata, env.watchReference);
      assert.strictEqual(value, '{{ watch }}');
    });

    it('returns the raw string when hasOwnProperty is referenced', function(){
      var value = Resolver.format(ctxdata, env.hasOwnPropertyReference);
      assert.strictEqual(value, '{{ hasOwnProperty }}');
    });

    it('returns the raw string when isPrototypeOf is referenced', function(){
      var value = Resolver.format(ctxdata, env.isPrototypeOfReference);
      assert.strictEqual(value, '{{ isPrototypeOf }}');
    });

    it('returns the raw string when toString is referenced', function(){
      var value = Resolver.format(ctxdata, env.toStringReference);
      assert.strictEqual(value, '{{ toString }}');
    });

    it('returns the raw string when __proto__ is referenced', function(){
      var value = Resolver.format(ctxdata, env.protoReference);
      assert.strictEqual(value, '{{ __proto__ }}');
    });

  });

  describe('and strings', function(){

    before(function() {
      ctxdata = {
        str: 'string',
        num: '1'
      };
      source = [
        'stringProp={{ str }}',
        'stringIndex={[ plural(str) ]}',
        'stringIndex[one]=One',
        'stringNumProp={{ num }}',
        'stringNumIndex={[ plural(num) ]}',
        'stringNumIndex[one]=One'
      ].join('\n');
    });

    it('returns a string value', function(){
      assert.strictEqual(
        Resolver.format(ctxdata, env.stringProp), 'string');
    });

    it('throws when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.stringIndex);
      }, 'Unresolvable value');
    });

    it('digit returns a string value', function(){
      assert.strictEqual(
        Resolver.format(ctxdata, env.stringNumProp), '1');
    });

    it('digit throws when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.stringNumIndex);
      }, 'Unresolvable value');
    });

  });

  describe('and numbers', function(){

    before(function() {
      ctxdata = {
        num: 1,
        nan: NaN
      };
      source = [
        'numProp={{ num }}',
        'numIndex={[ plural(num) ]}',
        'numIndex[one]=One',
        'nanProp={{ nan }}',
        'nanIndex={[ plural(nan) ]}',
        'nanIndex[one]=One'
      ].join('\n');
    });

    it('returns a number value', function(){
      assert.strictEqual(Resolver.format(ctxdata, env.numProp), '1');
    });

    it('returns a value when used in macro', function(){
      assert.strictEqual(Resolver.format(ctxdata, env.numIndex), 'One');
    });

    it('returns the raw string when NaN is referenced', function(){
      var value = Resolver.format(ctxdata, env.nanProp);
      assert.strictEqual(value, '{{ nan }}');
    });

    it('is undefined when NaN is used in macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.nanIndex);
      }, 'Arg must be a string or a number: nan');
    });

  });

  describe('and bools', function(){

    before(function() {
      ctxdata = {
        bool: true
      };
      source = [
        'boolProp={{ bool }}',
        'boolIndex={[ plural(bool) ]}',
        'boolIndex[one]=One'
      ].join('\n');
    });

    it('returns the raw string when referenced', function(){
      var value = Resolver.format(ctxdata, env.boolProp);
      assert.strictEqual(value, '{{ bool }}');
    });

    it('is undefined when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.boolIndex);
      }, 'Arg must be a string or a number: bool');
    });

  });

  describe('and undefined', function(){

    before(function() {
      ctxdata = {
        undef: undefined
      };
      source = [
        'undefProp={{ undef }}',
        'undefIndex={[ plural(undef) ]}',
        'undefIndex[one]=One'
      ].join('\n');
    });

    it('returns the raw string when referenced', function(){
      var value = Resolver.format(ctxdata, env.undefProp);
      assert.strictEqual(value, '{{ undef }}');
    });

    it('is undefined when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.undefIndex);
      }, 'Arg must be a string or a number: undef');
    });

  });

  describe('and null', function(){

    before(function() {
      ctxdata = {
        nullable: null
      };
      source = [
        'nullProp={{ nullable }}',
        'nullIndex={[ plural(nullable) ]}',
        'nullIndex[one]=One'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.format(ctxdata, env.nullProp);
      assert.strictEqual(value, '{{ nullable }}');
    });

    it('is undefined when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.nullIndex);
      }, 'Arg must be a string or a number: nullable');
    });

  });

  describe('and arrays where first element is number', function(){

    before(function() {
      ctxdata = {
        arr: [1, 2]
      };
      source = [
        'arrProp={{ arr }}',
        'arrIndex={[ plural(arr) ]}',
        'arrIndex[one]=One'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.format(ctxdata, env.arrProp);
      assert.strictEqual(value, '{{ arr }}');
    });

    it('is undefined when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.arrIndex);
      }, 'Arg must be a string or a number: arr');
    });

  });

  describe('and arrays where first element is not a number', function(){

    before(function() {
      ctxdata = {
        arr: ['a', 'b']
      };
      source = [
        'arrProp={{ arr }}',
        'arrIndex={[ plural(arr) ]}',
        'arrIndex[one]=One'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.format(ctxdata, env.arrProp);
      assert.strictEqual(value, '{{ arr }}');
    });

    it('is undefined when used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.arrIndex);
      }, 'Arg must be a string or a number: arr');
    });

  });

  describe('and objects', function(){

    before(function() {
      ctxdata = {
        obj: {
          key: 'value'
        }
      };
      source = [
        'objProp={{ obj }}',
        'objIndex={[ plural(obj) ]}',
        'objIndex[one]=One'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.format(ctxdata, env.objProp);
      assert.strictEqual(value, '{{ obj }}');
    });

    it('throws used in a macro', function(){
      assert.throws(function() {
        Resolver.format(ctxdata, env.objIndex);
      }, 'Arg must be a string or a number: obj');
    });
  });

});
