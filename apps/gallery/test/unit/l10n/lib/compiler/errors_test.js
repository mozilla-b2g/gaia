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

describe('Compiler errors:', function(){
  var source, env;
  beforeEach(function() {
    env = compile(source);
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
      assert.strictEqual(env.prompt.toString({n: 1}), 'One File');
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
      var value = env.prompt.toString({n: 1});
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
      assert.strictEqual(env.prompt.toString({n: 1}), 'One File');
    });

    it('throws an IndexError if n is not defined', function(){
      var value = env.prompt.toString();
      assert.strictEqual(value, 'Files');
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
      assert.strictEqual(env.prompt.toString({n: 1}), 'One File');
    });

    it('throws an IndexError if n is not defined', function(){
      var value = env.prompt.toString();
      assert.strictEqual(value, undefined);
    });

  });

});

