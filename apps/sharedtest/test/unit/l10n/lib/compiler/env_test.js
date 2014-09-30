/* global it, beforeEach, assert, describe, requireApp */
'use strict';
var compile;

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/compiler/header.js');
} else {
  compile = require('./header.js').compile;
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
