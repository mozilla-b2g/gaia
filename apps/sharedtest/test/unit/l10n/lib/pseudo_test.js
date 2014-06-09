/* global it, assert:true, describe, before, beforeEach */
/* global window, navigator, process */
'use strict';

var assert = require('assert') || window.assert;

describe('pseudo strategy', function() {
  var L10n, strategy, source, ast;

  before(function(done) {
    if (typeof navigator !== 'undefined') {
      require('/build/l10n.js', function() {
        L10n = navigator.mozL10n._getInternalAPI();
        done();
      });
    } else {
      L10n = {};
      L10n.PSEUDO_STRATEGIES = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/pseudo').PSEUDO_STRATEGIES
        : require('../../lib/l20n/pseudo').PSEUDO_STRATEGIES;
      L10n.walkContent = require('../../lib/l20n/util').walkContent;
      L10n.parse = require('../../lib/l20n/parser').parse;
      done();
    }
  });

  beforeEach(function() {
    ast = L10n.parse(null, source);
  });

  describe('accented English', function(){

    before(function() {
      strategy = L10n.PSEUDO_STRATEGIES['qps-ploc'];
      source = [
        'foo=Foo',

        'bar={[ plural(n) ]}',
        'bar[one]=One',
        'bar[two]=Two',
        'bar[few]=Few',
        'bar[many]=Many',
        'bar[other]=Other',

        'baz.attr=An attribute',
        'baz.attrComplex=An attribute referencing {{ foo }}',

        'templateVar={name} wrote',
        'dateFormat=%A, %b %Eb',
        'twoPlaceables1={{ foo }} {{ bar }}',
        'twoPlaceables2=Foo {{ foo }} and bar {{ bar }}',
        'parens1=({{ foo }}) {{ bar }}',
        'parens2=Foo ({{foo}}) [and/or {{bar}}]',
        'parens3=Foo (and) bar',
        'unicode=Foo \u0066\u006f\u006f\u0020',
        'nonascii=Naïve coöperation résumé dæmon phœnix',
      ].join('\n');
    });

    it('walks the value', function(){
      var walked = L10n.walkContent(ast, strategy);
      assert.strictEqual(walked.foo, 'Ƒǿǿǿǿ');

      assert.strictEqual(walked.bar._.one, 'Ǿǿƞḗḗ');
      assert.strictEqual(walked.bar._.two, 'Ŧẇǿǿ');
      assert.strictEqual(walked.bar._.few, 'Ƒḗḗẇ');
      assert.strictEqual(walked.bar._.many, 'Ḿȧȧƞẏ');
      assert.strictEqual(walked.bar._.other, 'Ǿǿŧħḗḗř');

      assert.strictEqual(walked.baz.attr, 'Ȧȧƞ ȧȧŧŧřīīƀŭŭŧḗḗ');
      assert.strictEqual(walked.baz.attrComplex,
                         'Ȧȧƞ ȧȧŧŧřīīƀŭŭŧḗḗ řḗḗƒḗḗřḗḗƞƈīīƞɠ {{ foo }}');

      assert.strictEqual(walked.templateVar, '{name} ẇřǿǿŧḗḗ');
      assert.strictEqual(walked.dateFormat, '%A, %b %Eb');
      assert.strictEqual(walked.twoPlaceables1, '{{ foo }} {{ bar }}');
      assert.strictEqual(walked.twoPlaceables2,
                         'Ƒǿǿǿǿ {{ foo }} ȧȧƞḓ ƀȧȧř {{ bar }}');
      assert.strictEqual(walked.parens1, '({{ foo }}) {{ bar }}');
      assert.strictEqual(walked.parens2,
                         'Ƒǿǿǿǿ ({{foo}}) [ȧȧƞḓ/ǿǿř {{bar}}]');
      assert.strictEqual(walked.parens3, 'Ƒǿǿǿǿ (ȧȧƞḓ) ƀȧȧř');
      assert.strictEqual(walked.unicode, 'Ƒǿǿǿǿ ƒǿǿǿǿ ');
      assert.strictEqual(walked.nonascii,
                         'Ƞȧȧïṽḗḗ ƈǿǿöƥḗḗřȧȧŧīīǿǿƞ řéşŭŭḿé ḓæḿǿǿƞ ƥħœƞīīẋ');
    });

  });

  describe('mirrored English', function(){
    /* jshint -W100 */

    before(function() {
      strategy = L10n.PSEUDO_STRATEGIES['qps-plocm'];
      source = [
        'foo=Foo',

        'bar={[ plural(n) ]}',
        'bar[one]=One',
        'bar[two]=Two',
        'bar[few]=Few',
        'bar[many]=Many',
        'bar[other]=Other',

        'baz.attr=An attribute',
        'baz.attrComplex=An attribute referencing {{ foo }}',

        'templateVar={name} wrote',
        'dateFormat=%A, %b %Eb',
        'twoPlaceables1={{ foo }} {{ bar }}',
        'twoPlaceables2=Foo {{ foo }} and bar {{ bar }}',
        'parens1=({{ foo }}) {{ bar }}',
        'parens2=Foo ({{foo}}) [and/or {{bar}}]',
        'parens3=Foo (and) bar',
        'unicode=Foo \u0066\u006f\u006f\u0020',
        'nonascii=Naïve coöperation résumé dæmon phœnix',
      ].join('\n');
    });

    it('walks the value', function(){
      var walked = L10n.walkContent(ast, strategy);
      assert.strictEqual(walked.foo, '‮ɟoo‬');

      assert.strictEqual(walked.bar._.one, '‮Ouǝ‬');
      assert.strictEqual(walked.bar._.two, '‮⊥ʍo‬');
      assert.strictEqual(walked.bar._.few, '‮ɟǝʍ‬');
      assert.strictEqual(walked.bar._.many, '‮Wɐuʎ‬');
      assert.strictEqual(walked.bar._.other, '‮Oʇɥǝɹ‬');

      assert.strictEqual(walked.baz.attr, '‮∀u‬ ‮ɐʇʇɹıqnʇǝ‬');
      assert.strictEqual(walked.baz.attrComplex,
                         '‮∀u‬ ‮ɐʇʇɹıqnʇǝ‬ ' +
                         '‮ɹǝɟǝɹǝuɔıuƃ‬ {{ foo }}');

      assert.strictEqual(walked.templateVar, '{name} ‮ʍɹoʇǝ‬');
      assert.strictEqual(walked.dateFormat, '%A, %b %Eb');
      assert.strictEqual(walked.twoPlaceables1, '{{ foo }} {{ bar }}');
      assert.strictEqual(walked.twoPlaceables2,
                         '‮ɟoo‬ {{ foo }} ‮ɐup‬ ' +
                         '‮qɐɹ‬ {{ bar }}');
      assert.strictEqual(walked.parens1, '({{ foo }}) {{ bar }}');
      assert.strictEqual(walked.parens2,
                         '‮ɟoo‬ ({{foo}}) ' +
                         '[‮ɐup‬/‮oɹ‬ {{bar}}]');
      assert.strictEqual(walked.parens3,
                         '‮ɟoo‬ (‮ɐup‬) ‮qɐɹ‬');
      assert.strictEqual(walked.unicode, '‮ɟoo‬ ‮ɟoo‬ ');
    });

    // XXX this requires Unicode support for JavaSript RegExp objects
    // https://bugzil.la/258974
    it.skip('walks the value', function(){
      var walked = L10n.walkContent(ast, strategy);
      assert.strictEqual(walked.nonascii,
                         '‮Nɐïʌǝ‬ ‮ɔoödǝɹɐʇıou‬ ' +
                         '‮ɹésnɯé‬ ‮pæɯou‬ ' +
                         '‮dɥœuıx‬');
    });

  });

});
