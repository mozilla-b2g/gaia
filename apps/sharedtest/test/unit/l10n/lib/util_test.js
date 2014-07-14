/* global it, assert:true, describe, before, beforeEach */
/* global window, navigator, process */
'use strict';

var assert = require('assert') || window.assert;
var PropertiesParser, propertiesParser;

var reVowels = /[AEIOUaeiou]/;

function digest(str) {
  var cur = 0;
  var i = str.length;
  while (i) {
    if (reVowels.test(str[--i])) {
      cur++;
    }
  }
  return cur;
}

describe('walkContent', function() {
  var L10n, source, ast;

  before(function(done) {
    if (typeof navigator !== 'undefined') {
      require('/build/l10n.js', function() {
        L10n = navigator.mozL10n._getInternalAPI();
        PropertiesParser = L10n.PropertiesParser;
        propertiesParser = new PropertiesParser();
        done();
      });
    } else {
      L10n = {};
      L10n.walkContent = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/util').walkContent
        : require('../../lib/l20n/util').walkContent;

      PropertiesParser = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/parser').PropertiesParser
        : require('../../lib/l20n/format/properties/parser').PropertiesParser;
      propertiesParser = new PropertiesParser();
      done();
    }
  });


  beforeEach(function() {
    ast = propertiesParser.parse(null, source);
  });

  describe('simple strings and attributes', function(){

    before(function() {
      source = [
        'foo=Foo',
        'foo.attr=An attribute',
        'foo.attrComplex=An attribute referencing {{ foo }}',
      ].join('\n');
    });

    it('walks the value', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo._, 2);
    });

    it('walks the attributes', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo.attr, 5);
      assert.strictEqual(walked.foo.attrComplex, 11);
    });

  });

  describe('one-level-deep dict', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[one]=One',
        'foo[two]=Two',
        'foo[few]=Few',
        'foo[many]=Many',
        'foo[other]=Other',
      ].join('\n');
    });

    it('walks the values', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo._.one, 2);
      assert.strictEqual(walked.foo._.two, 1);
      assert.strictEqual(walked.foo._.few, 1);
      assert.strictEqual(walked.foo._.many, 1);
      assert.strictEqual(walked.foo._.other, 2);
    });

    it('does not walk the index', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo._index, undefined);
    });

  });

  // XXX parser currently doesn't support nested dicts
  describe.skip('two-level-deep dict', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[other]={[ plural(m) ]}',
        'foo[other][one]=One',
        'foo[other][two]=Two',
        'foo[other][few]=Few',
        'foo[other][many]=Many',
        'foo[other][other]=Other',
      ].join('\n');
    });

    it('walks the values', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo._.other._.one, 2);
      assert.strictEqual(walked.foo._.other._.two, 1);
      assert.strictEqual(walked.foo._.other._.few, 1);
      assert.strictEqual(walked.foo._.other._.many, 1);
      assert.strictEqual(walked.foo._.other._.other, 2);
    });

    it('does not walk the indexes', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo._index, undefined);
      assert.strictEqual(walked.foo._.other._index, undefined);
    });

  });

  describe('attribute that is a one-level-deep dict', function(){

    before(function() {
      source = [
        'foo.attr={[ plural(n) ]}',
        'foo.attr[one]=One',
        'foo.attr[two]=Two',
        'foo.attr[few]=Few',
        'foo.attr[many]=Many',
        'foo.attr[other]=Other',
      ].join('\n');
    });

    it('walks the values', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo.attr._.one, 2);
      assert.strictEqual(walked.foo.attr._.two, 1);
      assert.strictEqual(walked.foo.attr._.few, 1);
      assert.strictEqual(walked.foo.attr._.many, 1);
      assert.strictEqual(walked.foo.attr._.other, 2);
    });

    it('does not walk the indexes', function(){
      var walked = L10n.walkContent(ast, digest);
      assert.strictEqual(walked.foo.attr._index, undefined);
    });

  });

});
