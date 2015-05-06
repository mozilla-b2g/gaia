/* global it, assert:true, describe */
/* global navigator */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
} else {
  var assert = require('assert');
  var L10n = {
    PropertiesParser: require('../../../src/lib/format/properties/parser')
  };
}

describe('L10n Parser', function() {

  it('string value', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id = string');
    assert.strictEqual(ast[0].$v, 'string');
  });

  it('empty value', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id =');
    assert.equal(ast[0].$v, '');
  });

  it('empty value with white spaces', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id =  ');
    assert.equal(ast[0].$v, '');
  });

  it('basic errors', function() {
    var strings = [
      '',
      'id',
      'id ',
      '+id',
      '=id',
    ];

    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {
        var ast = L10n.PropertiesParser.parse(null, strings[i]);
        assert.equal(Object.keys(ast).length, 0);
      }
    }
  });

  it('basic attributes', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id.attr1 = foo');
    assert.equal(ast[0].attr1, 'foo');
  });

  it('empty attribute', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id.attr1 =');
    assert.equal(ast[0].attr1, '');
  });

  it('empty attribute with white spaces', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id.attr1 = ');
    assert.equal(ast[0].attr1, '');
  });

  it('attribute errors', function() {
    var strings = [
      ['key.foo.bar = foo', /Nested attributes are not supported./],
      ['key.$attr = foo', /Attribute can't start/],
    ];

    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {

        /* jshint -W083 */
        assert.throws(function() {
          L10n.PropertiesParser.parse(null, strings[i][0]);
        }, strings[i][1]);
      }
    }
  });

  it('plural macro', function() {
    var ast = L10n.PropertiesParser.parse(null,
      'id = {[ plural(m) ]} \nid[one] = foo');
    assert.ok(ast[0].$v instanceof Object);
    assert.equal(ast[0].$v.one, 'foo');
    assert.equal(ast[0].$x.length, 2);
    assert.equal(ast[0].$x[0].t, 'idOrVar');
    assert.equal(ast[0].$x[0].v, 'plural');
    assert.equal(ast[0].$x[1], 'm');
  });

  it('plural macro errors', function() {
    var strings = [
      'id = {[ plural(m) ] \nid[one] = foo',
      'id = {[ plural(m) \nid[one] = foo',
      'id = { plural(m) ]} \nid[one] = foo',
      'id = plural(m) ]} \nid[one] = foo',
      'id = {[ plural(m ]} \nid[one] = foo',
      'id = {[ pluralm) ]} \nid[one] = foo',

    ];
    var errorsThrown = 0;

    for (var i in strings) {
      if (strings.hasOwnProperty(i)) {
        try {
          L10n.PropertiesParser.parse(null, strings[i]);
        } catch (e) {
          errorsThrown += 1;
        }
      }
    }
    assert.equal(errorsThrown, strings.length);
  });

  it('comment', function() {
    var ast = L10n.PropertiesParser.parse(null, '#test');
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
        var ast = L10n.PropertiesParser.parse(null, strings[i]);
        assert.equal(Object.keys(ast).length, 0);
      }
    }
  });

});
