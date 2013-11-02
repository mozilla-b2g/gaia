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

describe('Index', function(){
  var source, env;

  beforeEach(function() {
    env = compile(source);
  });

  describe('Cyclic reference to the same entity', function(){

    before(function() {
      source = [
        'foo={[ plural(foo) ]}',
        'foo[one]=One'
      ].join('\n');
    });

    it('is undefined', function() {
      var value = env.foo.toString();
      assert.strictEqual(value, undefined);
    });

  });

  describe('Reference from an attribute to the value of the same ' +
           'entity', function(){

    before(function() {
      source = [
        'foo=Foo',
        'foo.attr={[ plural(foo) ]}',
        'foo.attr[one]=One'
      ].join('\n');
    });

    it('value of the attribute is undefined', function() {
      var entity = env.foo.valueOf();
      assert.strictEqual(entity.value, 'Foo');
      assert.strictEqual(entity.attributes.attr, undefined);
    });

  });

});
