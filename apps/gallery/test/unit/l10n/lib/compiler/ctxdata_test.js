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

describe('Context data', function(){
  var source, ctxdata, env;

  beforeEach(function() {
    env = compile(source);
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
      var value = env.unread.toString(ctxdata);
      assert.strictEqual(value, 'Unread notifications: 3');
    });

    it('can be passed as argument to a macro', function() {
      var value = env.unreadPlural.toString(ctxdata);
      assert.strictEqual(value, '3 unread notifications');
    });

    it('takes priority over entities of the same name', function() {
      var value = env.useFoo.toString(ctxdata);
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
      var value = env.missingReference.toString(ctxdata);
      assert.strictEqual(value, '{{ missing }}');
    });

    it('returns the raw string when an object is referenced', function(){
      var value = env.nestedReference.toString(ctxdata);
      assert.strictEqual(value, '{{ nested }}');
    });

    it('returns the raw string when watch is referenced', function(){
      var value = env.watchReference.toString(ctxdata);
      assert.strictEqual(value, '{{ watch }}');
    });

    it('returns the raw string when hasOwnProperty is referenced', function(){
      var value = env.hasOwnPropertyReference.toString(ctxdata);
      assert.strictEqual(value, '{{ hasOwnProperty }}');
    });

    it('returns the raw string when isPrototypeOf is referenced', function(){
      var value = env.isPrototypeOfReference.toString(ctxdata);
      assert.strictEqual(value, '{{ isPrototypeOf }}');
    });

    it('returns the raw string when toString is referenced', function(){
      var value = env.toStringReference.toString(ctxdata);
      assert.strictEqual(value, '{{ toString }}');
    });

    it('returns the raw string when __proto__ is referenced', function(){
      var value = env.protoReference.toString(ctxdata);
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
      assert.strictEqual(env.stringProp.toString(ctxdata), 'string');
    });

    it('is undefined when used in a macro', function(){
      var value = env.stringIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
    });

    it('digit returns a string value', function(){
      assert.strictEqual(env.stringNumProp.toString(ctxdata), '1');
    });

    it('digit returns undefined when used in a macro', function(){
      var value = env.stringNumIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      assert.strictEqual(env.numProp.toString(ctxdata), '1');
    });

    it('returns a value when used in macro', function(){
      assert.strictEqual(env.numIndex.toString(ctxdata), 'One');
    });

    it('returns the raw string when NaN is referenced', function(){
      var value = env.nanProp.toString(ctxdata);
      assert.strictEqual(value, '{{ nan }}');
    });

    it('is undefined when NaN is used in macro', function(){
      var value = env.nanIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      var value = env.boolProp.toString(ctxdata);
      assert.strictEqual(value, '{{ bool }}');
    });

    it('is undefined when used in a macro', function(){
      var value = env.boolIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      var value = env.undefProp.toString(ctxdata);
      assert.strictEqual(value, '{{ undef }}');
    });

    it('is undefined when used in a macro', function(){
      var value = env.undefIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      var value = env.nullProp.toString(ctxdata);
      assert.strictEqual(value, '{{ nullable }}');
    });

    it('is undefined when used in a macro', function(){
      var value = env.nullIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      var value = env.arrProp.toString(ctxdata);
      assert.strictEqual(value, '{{ arr }}');
    });

    it('is undefined when used in a macro', function(){
      var value = env.arrIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      var value = env.arrProp.toString(ctxdata);
      assert.strictEqual(value, '{{ arr }}');
    });

    it('is undefined when used in a macro', function(){
      var value = env.arrIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
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
      var value = env.objProp.toString(ctxdata);
      assert.strictEqual(value, '{{ obj }}');
    });

    it('is undefined when used in a macro', function(){
      var value = env.objIndex.toString(ctxdata);
      assert.strictEqual(value, undefined);
    });
  });

});
