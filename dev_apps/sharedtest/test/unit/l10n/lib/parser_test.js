/* global it, assert:true, describe */
/* global window, navigator, process */
'use strict';

var assert = require('assert') || window.assert;
var parse;

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  parse = L10n.parse.bind(null, null);
} else {
  parse = process.env.L20N_COV ?
    require('../../build/cov/lib/l20n/parser').parse.bind(null, null)
    : require('../../lib/l20n/parser').parse.bind(null,null);
}

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
