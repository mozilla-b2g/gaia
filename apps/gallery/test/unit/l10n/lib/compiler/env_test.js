/* global it, beforeEach, assert:true, describe */
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

describe('Env object', function(){
  var source, env;

  beforeEach(function() {
    source = [
      'foo=Foo',
      'getFoo={{ foo }}',
      'getBar={{ bar }}'
    ].join('\n');
    env = compile(source);
  });

  it('works', function() {
    assert.strictEqual(env.foo.toString(), 'Foo');
    assert.strictEqual(env.getFoo.toString(), 'Foo');
    assert.strictEqual(env.getBar.toString(), '{{ bar }}');
  });

  it('cannot be modified by another compilation', function() {
    var source2 = [
      'foo=Foo',
      'bar=Bar'
    ].join('\n');
    compile(source2);

    assert.strictEqual(env.foo.toString(), 'Foo');
    assert.strictEqual(env.getFoo.toString(), 'Foo');
    assert.strictEqual(env.getBar.toString(), '{{ bar }}');
  });

});
