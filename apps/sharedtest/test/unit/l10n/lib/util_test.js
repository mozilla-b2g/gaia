/* global it, assert:true, describe, before, beforeEach */
/* global navigator, process */
'use strict';

var assert, PropertiesParser;

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
        done();
      });
    } else {
      assert = require('assert');
      L10n = {};
      L10n.walkContent = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/util').walkContent
        : require('../../lib/l20n/util').walkContent;

      PropertiesParser = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/parser')
        : require('../../lib/l20n/format/properties/parser');
      done();
    }
  });


  beforeEach(function() {
    ast = PropertiesParser.parse(null, source);
  });

  describe('simple strings and attributes', function(){

    before(function() {
      source = [
        'foo=Foo',
        'foo.attr=An attribute',
      ].join('\n');
    });

    it('walks the value', function(){
      var walked = L10n.walkContent(ast[0], digest);
      assert.strictEqual(walked.$v, 2);
    });

    it('walks the attribute', function(){
      var walked = L10n.walkContent(ast[0], digest);
      assert.strictEqual(walked.attr, 5);
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
      var walked = L10n.walkContent(ast[0], digest);
      assert.strictEqual(walked.$v.one, 2);
      assert.strictEqual(walked.$v.two, 1);
      assert.strictEqual(walked.$v.few, 1);
      assert.strictEqual(walked.$v.many, 1);
      assert.strictEqual(walked.$v.other, 2);
    });

    it('does not modify the index', function(){
      var walked = L10n.walkContent(ast[0], digest);
      assert.deepEqual(walked.$x, [{t: 'idOrVar', v: 'plural'}, 'n']);
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
      var walked = L10n.walkContent(ast[0], digest);
      assert.strictEqual(walked.$v.other.one, 2);
      assert.strictEqual(walked.$v.other.two, 1);
      assert.strictEqual(walked.$v.other.few, 1);
      assert.strictEqual(walked.$v.other.many, 1);
      assert.strictEqual(walked.$v.other.other, 2);
    });

    it('does not modify the indexes', function(){
      var walked = L10n.walkContent(ast[0], digest);
      assert.deepEqual(
        walked.$x, [{t: 'idOrVar', v: 'plural'}, 'n']);
      assert.deepEqual(
        walked.$v.other.$x, [{t: 'idOrVar', v: 'plural'}, 'n']);
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
      var walked = L10n.walkContent(ast[0], digest);
      assert.strictEqual(walked.attr.$v.one, 2);
      assert.strictEqual(walked.attr.$v.two, 1);
      assert.strictEqual(walked.attr.$v.few, 1);
      assert.strictEqual(walked.attr.$v.many, 1);
      assert.strictEqual(walked.attr.$v.other, 2);
    });

    it('does not modify the indexes', function(){
      var walked = L10n.walkContent(ast[0], digest);
      assert.deepEqual(walked.attr.$x, [{t: 'idOrVar', v: 'plural'}, 'n']);
    });

  });

});
