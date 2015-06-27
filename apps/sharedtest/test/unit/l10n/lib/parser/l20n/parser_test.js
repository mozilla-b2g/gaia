/* global it, assert:true, describe */
/* global navigator */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
} else {
  var assert = require('assert');
  var L10n = {
    L20nParser: require('../../../../src/lib/format/l20n/parser')
  };
}


var parse = L10n.L20nParser.parse.bind(L10n.L20nParser);

describe('L10n Parser', function() {
  describe('Parser', function() {
    it('malformed entity errors', function() {
      var strings = [
        'd',
        '<',
        '<i',
        '<id',
        '<id<',
        '<id ',
        '<>',
        '<"">',
        '< "">',
        '< id>',
        '<id>',
        '<id>',
        '<id ">',
        '<id \'>',
        '<id ""',
        '<id <',
        '<<',
        '< <',
        '<!id',
        '<*id',
        '<id "value>',
        '<id value">',
        '<id \'value">',
        '<id \'value>',
        '<id value\'>',
        '<id"value">',
        '< id "value">',
      ];
      for (var i in strings) {
        /* jshint -W083 */
        if (strings.hasOwnProperty(i)) {
          assert.throws(function() {
            parse(null, strings[i]);
          });
        }
      }
    });
  });

  describe('Simple strings', function() {
    it('string value with double quotes', function() {
      var ast = parse(null, '<id "string">');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('string value with single quotes', function() {
      var ast = parse(null, '<id \'string\'>');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('empty value', function() {
      var ast = parse(null, '<id "">');
      assert.equal(ast[0].$v, '');
    });
  });

  describe('String escapes', function() {
    it('single doublequote escape', function() {
      var ast = parse(null, '<id "\\"">');
      assert.strictEqual(ast[0].$v, '"');
    });

    it('single singlequote escape', function() {
      var ast = parse(null, '<id \'\\\'\'>');
      assert.strictEqual(ast[0].$v, '\'');
    });

    it('single doublequote escape in the middle of a word', function() {
      var ast = parse(null, '<id "str\\"ing">');
      assert.strictEqual(ast[0].$v, 'str"ing');
    });

    it('double escape', function() {
      var ast = parse(null, '<id "test \\\\ more">');
      assert.strictEqual(ast[0].$v, 'test \\ more');
    });

    it('double escape at the end', function() {
      var ast = parse(null, '<id "test \\\\">');
      assert.strictEqual(ast[0].$v, 'test \\');
    });
  });

  describe('Unicode escapes', function() {
    it('simple unicode escape', function() {
      var ast = parse(null, '<id "string \\ua0a0 foo">');
      assert.strictEqual(ast[0].$v, 'string ꂠ foo');
    });

    it('unicode escapes before placeable and end', function() {
      var ast = parse(null, '<id "string \\ua0a0{{ foo }} foo \\ua0a0">');
      assert.strictEqual(ast[0].$v[0], 'string ꂠ');
      assert.strictEqual(ast[0].$v[2], ' foo ꂠ');
    });
  });

  describe('Complex strings', function() {
    it('string with a placeable', function() {
      var ast = parse(null, '<id "test {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test ');
      assert.deepEqual(ast[0].$v[1], { t: 'idOrVar', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped double quote', function() {
      var ast = parse(null, '<id "test \\\" {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test " ');
      assert.deepEqual(ast[0].$v[1], { t: 'idOrVar', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });
  });

  describe('Hash values', function() {
    it('simple hash value', function() {
      var ast = parse(null, '<id {one: "One", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('simple hash value with a trailing comma', function() {
      var ast = parse(null, '<id {one: "One", many: "Many", }>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('nested hash value', function() {
      var ast = parse(null, '<id {one: {oneone: "foo"}, many: "Many"}>');
      assert.strictEqual(ast[0].$v.one.oneone, 'foo');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('hash value with a complex string', function() {
      var ast = parse(null, '<id {one: "foo {{ $n }}", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one[0], 'foo ');
      assert.deepEqual(ast[0].$v.one[1], {t: 'idOrVar', v: 'n'});
    });

    it('hash errors', function() {
      var strings = [
        '<id {}>',
        '<id {a: 2}>',
        '<id {a: "d">',
        '<id a: "d"}>',
        '<id {{a: "d"}>',
        '<id {a: "d"}}>',
        '<id {a:} "d"}>',
        '<id {2}>',
        '<id {"a": "foo"}>',
        '<id {"a": \'foo\'}>',
        '<id {2: "foo"}>',
        '<id {a:"foo"b:"foo"}>',
        '<id {a }>',
        '<id {a: 2, b , c: 3 } >',
        '<id {*a: "v", *b: "c"}>',
        '<id {}>',
      ];
      for (var i in strings) {
        /* jshint -W083 */
        if (strings.hasOwnProperty(i)) {
          assert.throws(function() {
            parse(null, strings[i]);
          });
        }
      }
    });
  });

  describe('Attributes', function() {
    it('simple attribute', function() {
      var ast = parse(null, '<id "foo" title: "Title">');
      assert.strictEqual(ast[0].title, 'Title');
    });

    it('two attributes', function() {
      var ast = parse(null, '<id "foo" title: "Title" placeholder: "P">');
      assert.strictEqual(ast[0].title, 'Title');
      assert.strictEqual(ast[0].placeholder, 'P');
    });

    it('attribute with no value', function() {
      var ast = parse(null, '<id title: "Title">');
      assert.strictEqual(ast[0].$v, undefined);
      assert.strictEqual(ast[0].title, 'Title');
    });

    it('attribute with a complex value', function() {
      var ast = parse(null, '<id title: "Title {{ $n }}">');
      assert.strictEqual(ast[0].title[0], 'Title ');
      assert.deepEqual(ast[0].title[1], {t: 'idOrVar', v: 'n'});
    });

    it('attribute with hash value', function() {
      var ast = parse(null, '<id title: {one: "One"}>');
      assert.strictEqual(ast[0].title.one, 'One');
    });

    it('attribute errors', function() {
      var strings = [
        '<id : "foo">',
        '<id "value" : "foo">',
        '<id 2: "foo">',
        '<id a: >',
        '<id: "">',
        '<id a: b:>',
        '<id a: "foo" "heh">',
        '<id a: 2>',
        '<id "a": "a">',
        '<id a2:"a"a3:"v">',
      ];
      for (var i in strings) {
        /* jshint -W083 */
        if (strings.hasOwnProperty(i)) {
          assert.throws(function() {
            parse(null, strings[i]);
          });
        }
      }
    });
  });

  describe('Expressions', function() {
    it('call expression', function() {
      var ast = parse(null, '<id[@cldr.plural($n)] "foo">');
      assert.strictEqual(ast[0].$x[0].t, 'idOrVar');
      assert.strictEqual(ast[0].$x[0].v, 'plural');
      assert.strictEqual(ast[0].$x[1], 'n');
    });

    it('identifier errors', function() {
      var strings = [
        '<i`d "foo">',
        '<0d "foo">',
        '<09 "foo">',
        '<i!d "foo">',
        '<id[i`d] "foo">',
        '<id[0d] "foo">',
        '<id[i!d] "foo">',
      ];
      for (var i in strings) {
        /* jshint -W083 */
        if (strings.hasOwnProperty(i)) {
          assert.throws(function() {
            parse(null, strings[i]);
          });
        }
      }
    });
  });
});
