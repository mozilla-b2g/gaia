/* global it, assert:true, describe */
/* global window, navigator, process */
'use strict';

var assert = require('assert') || window.assert;
var PropertiesParser;

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  PropertiesParser = L10n.PropertiesParser;
} else {
  PropertiesParser = process.env.L20N_COV ?
    require('../../build/cov/lib/l20n/parser').PropertiesParser
    : require('../../lib/l20n/format/properties/parser').PropertiesParser;
}

var propertiesParser = new PropertiesParser();
var parse = propertiesParser.parse.bind(null, null);

describe('L10n Parser', function() {

  it('string value', function() {
    var ast = parse('id = string');
    assert.strictEqual(ast.id, 'string');
  });

  it('basic errors', function() {
    var strings = [
      '',
      'id',
      'id ',
      'id =',
      '+id',
      '=id',
    ];

    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {
        var ast = parse(strings[i]);
        assert.equal(Object.keys(ast).length, 0);
      }
    }
  });

  it('basic attributes', function() {
    var ast = parse('id.attr1 = foo');
    assert.equal(ast.id.attr1, 'foo');
  });

  it('attribute errors', function() {
    var strings = [
      'key.foo.bar = foo',
    ];

    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {

        /* jshint -W083 */
        assert.throws(function() {
          parse(strings[i]);
        }, /Nested attributes are not supported./);
      }
    }
  });

  it('plural macro', function() {
    var ast = parse('id = {[ plural(m) ]} \nid[one] = foo');
    assert.ok(ast.id._ instanceof Object);
    assert.equal(ast.id._.one, 'foo');
    assert.equal(ast.id._index.length, 2);
    assert.equal(ast.id._index[0], 'plural');
    assert.equal(ast.id._index[1], 'm');
  });

  it('plural macro errors', function() {
    var strings = [
      'id = {[ plural(m) ] \nid[one] = foo',
      'id = {[ plural(m) \nid[one] = foo',
      'id = { plural(m) ]} \nid[one] = foo',
      'id = plural(m) ]} \nid[one] = foo',
      'id = {[ m ]} \nid[one] = foo',
      'id = {[ plural ]} \nid[one] = foo',
      'id = {[ plural(m ]} \nid[one] = foo',
      'id = {[ pluralm) ]} \nid[one] = foo',

    ];
    var errorsThrown = 0;

    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {
        try {
          parse(strings[i]);
        } catch (e) {
          errorsThrown += 1;
        }
      }
    }
    assert.equal(errorsThrown, strings.length);
  });

  it('comment', function() {
    var ast = parse('#test');
    assert.equal(Object.keys(ast).length, 0);
  });

  it('comment errors', function() {
    var strings = [
      ' # foo',
      ' ## foo',
      'f# foo',
    ];
    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {
        var ast = parse(strings[i]);
        assert.equal(Object.keys(ast).length, 0);
      }
    }
  });

});
