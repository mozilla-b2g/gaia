/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header.js').Resolver;
  var createEntries = require('./header.js').createEntries;
}

describe('Compiler errors:', function(){
  var source, env;
  beforeEach(function() {
    env = createEntries(source);
  });

  describe('A complex string referencing an existing entity', function(){

    before(function() {
      source = [
        'file=File',
        'prompt={[ plural(n) ]}',
        'prompt[one]=One {{ file }}',
        'prompt[other]=Files'
      ].join('\n');
    });

    it('works with the default index', function(){
      assert.strictEqual(
        Resolver.format({n: 1}, env.prompt), 'One File');
    });

  });

  describe('A complex string referencing a missing entity', function(){

    before(function() {
      source = [
        'prompt={[ plural(n) ]}',
        'prompt[one]=One {{ file }}',
        'prompt[other]=Files'
      ].join('\n');
    });

    it('returns the raw string', function(){
      var value = Resolver.format({n: 1}, env.prompt);
      assert.strictEqual(value, 'One {{ file }}');
    });

  });

  describe('A ctxdata variable in the index, with "other"', function(){

    before(function() {
      source = [
        'file=File',
        'prompt={[ plural(n) ]}',
        'prompt[one]=One {{ file }}',
        'prompt[other]=Files'
      ].join('\n');
    });

    it('is found', function(){
      assert.strictEqual(
        Resolver.format({n: 1}, env.prompt), 'One File');
    });

    it('throws an IndexError if n is not defined', function(){
      assert.throws(function() {
        Resolver.format(null, env.prompt);
      }, 'Unknown reference: n');
    });

  });

  describe('A ctxdata variable in the index, without "other"', function(){

    before(function() {
      source = [
        'file=File',
        'prompt={[ plural(n) ]}',
        'prompt[one]=One {{ file }}',
      ].join('\n');
    });

    it('is found', function(){
      assert.strictEqual(
        Resolver.format({n: 1}, env.prompt), 'One File');
    });

    it('throws an IndexError if n is not defined', function(){
      assert.throws(function() {
        Resolver.format(null, env.prompt);
      }, 'Unknown reference: n');
    });

  });

});

