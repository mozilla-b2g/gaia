/* global it, assert:true, describe, before, beforeEach */
/* global navigator, process */
'use strict';

var assert;
var PropertiesParser;

describe('pseudo strategy', function() {
  var PSEUDO, walkContent, strategy, source, ast, walked;

  before(function(done) {
    if (typeof navigator !== 'undefined') {
      require('/shared/js/l10n.js', function() {
        PSEUDO = navigator.mozL10n.qps;
        var L10n = navigator.mozL10n._getInternalAPI();
        PropertiesParser = L10n.PropertiesParser;
        walkContent = L10n.walkContent;
        done();
      });
    } else {
      assert = require('assert');
      PSEUDO = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/pseudo').PSEUDO
        : require('../../lib/l20n/pseudo').PSEUDO;
      walkContent = require('../../lib/l20n/util').walkContent;

      PropertiesParser = process.env.L20N_COV ?
        require('../../build/cov/lib/l20n/parser')
        : require('../../lib/l20n/format/properties/parser');
      done();
    }
  });

  beforeEach(function() {
    ast = PropertiesParser.parse(null, source);
    walked = pseudolocalize(ast, strategy);
  });

  function pseudolocalize(arr, strategy) {
    var obj = {};
    arr.forEach(function(val) {
      obj[val.$i] = walkContent(val, strategy);
    });
    return obj;
  }

  var foo = {t: 'idOrVar', v: 'foo'};
  var bar = {t: 'idOrVar', v: 'bar'};

  describe('accented English', function(){

    before(function() {
      strategy = PSEUDO['qps-ploc'].translate;
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
      assert.strictEqual(walked.foo.$v, 'Ƒǿǿǿǿ');

      assert.strictEqual(walked.bar.$v.one, 'Ǿǿƞḗḗ');
      assert.strictEqual(walked.bar.$v.two, 'Ŧẇǿǿ');
      assert.strictEqual(walked.bar.$v.few, 'Ƒḗḗẇ');
      assert.strictEqual(walked.bar.$v.many, 'Ḿȧȧƞẏ');
      assert.strictEqual(walked.bar.$v.other, 'Ǿǿŧħḗḗř');

      assert.strictEqual(walked.baz.attr, 'Ȧȧƞ ȧȧŧŧřīīƀŭŭŧḗḗ');
      assert.deepEqual(
        walked.baz.attrComplex, ['Ȧȧƞ ȧȧŧŧřīīƀŭŭŧḗḗ řḗḗƒḗḗřḗḗƞƈīīƞɠ ', foo]);

      assert.strictEqual(walked.templateVar.$v, '{name} ẇřǿǿŧḗḗ');
      assert.strictEqual(walked.dateFormat.$v, '%A, %b %Eb');
      assert.deepEqual(walked.twoPlaceables1.$v, [foo, ' ', bar]);
      assert.deepEqual(
        walked.twoPlaceables2.$v, ['Ƒǿǿǿǿ ', foo, ' ȧȧƞḓ ƀȧȧř ', bar]);
      assert.deepEqual(
        walked.parens1.$v, ['(', foo, ') ', bar]);
      assert.deepEqual(
        walked.parens2.$v, ['Ƒǿǿǿǿ (', foo, ') [ȧȧƞḓ/ǿǿř ', bar, ']']);
      assert.strictEqual(walked.parens3.$v, 'Ƒǿǿǿǿ (ȧȧƞḓ) ƀȧȧř');
      assert.strictEqual(walked.unicode.$v, 'Ƒǿǿǿǿ ƒǿǿǿǿ ');
      assert.strictEqual(
        walked.nonascii.$v,
        'Ƞȧȧïṽḗḗ ƈǿǿöƥḗḗřȧȧŧīīǿǿƞ řéşŭŭḿé ḓæḿǿǿƞ ƥħœƞīīẋ');
    });

  });

  describe('mirrored English', function(){
    /* jshint -W100 */

    before(function() {
      strategy = PSEUDO['qps-plocm'].translate;
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
      assert.strictEqual(walked.foo.$v, '‮ɟoo‬');

      assert.strictEqual(walked.bar.$v.one, '‮Ouǝ‬');
      assert.strictEqual(walked.bar.$v.two, '‮⊥ʍo‬');
      assert.strictEqual(walked.bar.$v.few, '‮ɟǝʍ‬');
      assert.strictEqual(walked.bar.$v.many, '‮Wɐuʎ‬');
      assert.strictEqual(walked.bar.$v.other, '‮Oʇɥǝɹ‬');

      assert.strictEqual(
        walked.baz.attr, '‮∀u‬ ‮ɐʇʇɹıqnʇǝ‬');
      assert.deepEqual(
        walked.baz.attrComplex,
        ['‮∀u‬ ‮ɐʇʇɹıqnʇǝ‬ ‮ɹǝɟǝɹǝuɔıuƃ‬ ',
         foo]);

      assert.strictEqual(walked.templateVar.$v, '{name} ‮ʍɹoʇǝ‬');
      assert.strictEqual(walked.dateFormat.$v, '%A, %b %Eb');
      assert.deepEqual(walked.twoPlaceables1.$v, [foo, ' ', bar]);
      assert.deepEqual(
        walked.twoPlaceables2.$v,
        ['‮ɟoo‬ ', foo, ' ‮ɐup‬ ‮qɐɹ‬ ',
         bar]);
      assert.deepEqual(
        walked.parens1.$v, ['(', foo, ') ', bar]);
      assert.deepEqual(
        walked.parens2.$v,
        ['‮ɟoo‬ (', foo, ') [‮ɐup‬/‮oɹ‬ ',
         bar, ']']);
      assert.strictEqual(
        walked.parens3.$v,
        '‮ɟoo‬ (‮ɐup‬) ‮qɐɹ‬');
      assert.strictEqual(
        walked.unicode.$v,
        '‮ɟoo‬ ‮ɟoo‬ ');
    });

    // XXX this requires Unicode support for JavaSript RegExp objects
    // https://bugzil.la/258974
    it.skip('walks the value', function(){
      var walked = walkContent(ast, strategy);
      assert.strictEqual(
        walked.nonascii,
       '‮Nɐïʌǝ‬ ‮ɔoödǝɹɐʇıou‬ ' +
       '‮ɹésnɯé‬ ‮pæɯou‬ ' +
       '‮dɥœuıx‬');
    });

  });

});
