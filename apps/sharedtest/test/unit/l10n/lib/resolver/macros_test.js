/* global assert:true, it, before, beforeEach, describe, requireApp */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header.js').Resolver;
  var createEntries = require('./header.js').createEntries;
}

describe('Macros', function(){
  var source, ctxdata, env;
  beforeEach(function() {
    env = createEntries(source);
  });

  describe('referencing macros', function(){

    before(function() {
      ctxdata = {
        n: 1
      };
      source = [
        'placeMacro={{ plural }}',
        'placeRealMacro={{ __plural }}'
      ].join('\n');
    });

    it('throws when resolving (not calling) a macro in a complex ' +
       'string', function() {
      assert.strictEqual(
        Resolver.format(ctxdata, env.placeMacro)[1], '{{ plural }}');
      assert.strictEqual(
        Resolver.format(ctxdata, env.placeRealMacro)[1], '{{ __plural }}');
    });

  });

  describe('passing arguments', function(){

    before(function() {
      ctxdata = {
        n: 1
      };
      source = [
        'foo=Foo',
        'useFoo={{ foo }}',
        'bar={[ plural(n) ]}',
        'bar[one]=One',
        'bar.attr=Attr',

        'passFoo={[ plural(foo) ]}',
        'passFoo[one]=One',

        'passUseFoo={[ plural(useFoo) ]}',
        'passUseFoo[one]=One',

        'passBar={[ plural(bar) ]}',
        'passBar[one]=One',

        'passPlural={[ plural(plural) ]}',
        'passPlural[one]=One',

        'passMissing={[ plural(missing) ]}',
        'passMissing[one]=One',

        'passWatch={[ plural(watch) ]}',
        'passWatch[one]=One',
      ].join('\n');
    });

    it('throws if an entity is passed', function() {
      assert.throws(function() {
        Resolver.format(ctxdata, env.passFoo);
      }, 'Unresolvable value');
    });

    it('throws if a complex entity is passed', function() {
      assert.throws(function() {
        Resolver.format(ctxdata, env.passUseFoo);
      }, 'Unresolvable value');
    });

    it('throws if a hash entity is passed', function() {
      assert.throws(function() {
        Resolver.format(ctxdata, env.passBar);
      }, 'Unresolvable value');
    });

    it('throws if a macro is passed', function() {
      assert.throws(function() {
        Resolver.format(ctxdata, env.passPlural);
      }, 'Unresolvable value');
    });

    it('throws if a missing entry is passed', function() {
      assert.throws(function() {
        Resolver.format(ctxdata, env.passMissing);
      }, 'Unknown reference: missing');
    });

    it('throws if a native function is passed', function() {
      assert.throws(function() {
        Resolver.format(ctxdata, env.passWatch);
      }, 'Unknown reference: watch');
    });

  });
});

describe('A simple plural macro', function(){
  var source, env;

  beforeEach(function() {
    env = createEntries(source);
    env.__plural = function() {
      return 'other';
    };
  });

  before(function() {
    source = [
      'foo={[ plural(n) ]}',
      'foo[zero]=Zero',
      'foo[one]=One',
      'foo[two]=Two',
      'foo[few]=Few',
      'foo[many]=Many',
      'foo[other]=Other'
    ].join('\n');
  });

  it('returns zero for 0', function() {
    var value = Resolver.format({n: 0}, env.foo)[1];
    assert.strictEqual(value, 'Zero');
  });

  it('returns one for 1', function() {
    var value = Resolver.format({n: 1}, env.foo)[1];
    assert.strictEqual(value, 'One');
  });

  it('returns two for 2', function() {
    var value = Resolver.format({n: 2}, env.foo)[1];
    assert.strictEqual(value, 'Two');
  });

  it('returns other for 3', function() {
    var value = Resolver.format({n: 3}, env.foo)[1];
    assert.strictEqual(value, 'Other');
  });

  it('throws for no arg', function() {
    assert.throws(function() {
      Resolver.format(null, env.foo);
    }, 'Unknown reference: n');
  });

});

describe('A more complex plural macro', function(){
  var source, env;

  beforeEach(function() {
    env = createEntries(source);
    env.__plural = function(n) {
      // a made-up plural rule:
      // [0, 1) -> other
      // [1, Inf) -> many
      return (n >= 0 && n < 1) ? 'other' : 'many';
    };
  });

  describe('an entity with all plural forms defined', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[zero]=Zero',
        'foo[one]=One',
        'foo[two]=Two',
        'foo[few]=Few',
        'foo[many]=Many',
        'foo[other]=Other'
      ].join('\n');
    });

    it('returns zero for 0', function() {
      var value = Resolver.format({n: 0}, env.foo)[1];
      assert.strictEqual(value, 'Zero');
    });

    it('returns one for 1', function() {
      var value = Resolver.format({n: 1}, env.foo)[1];
      assert.strictEqual(value, 'One');
    });

    it('returns two for 2', function() {
      var value = Resolver.format({n: 2}, env.foo)[1];
      assert.strictEqual(value, 'Two');
    });

    it('returns many for 3', function() {
      var value = Resolver.format({n: 3}, env.foo)[1];
      assert.strictEqual(value, 'Many');
    });

    it('returns many for 5', function() {
      var value = Resolver.format({n: 5}, env.foo)[1];
      assert.strictEqual(value, 'Many');
    });

    it('returns other for 0.5', function() {
      var value = Resolver.format({n: 0.5}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('throws for no arg', function() {
      assert.throws(function() {
        Resolver.format(null, env.foo);
      }, 'Unknown reference: n');
    });

  });

  describe('an entity without the zero, one and two forms', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[many]=Many',
        'foo[other]=Other'
      ].join('\n');
    });

    it('returns other for 0', function() {
      var value = Resolver.format({n: 0}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('returns many for 1', function() {
      var value = Resolver.format({n: 1}, env.foo)[1];
      assert.strictEqual(value, 'Many');
    });

    it('returns many for 2', function() {
      var value = Resolver.format({n: 2}, env.foo)[1];
      assert.strictEqual(value, 'Many');
    });

    it('returns many for 3', function() {
      var value = Resolver.format({n: 3}, env.foo)[1];
      assert.strictEqual(value, 'Many');
    });

    it('returns many for 5', function() {
      var value = Resolver.format({n: 5}, env.foo)[1];
      assert.strictEqual(value, 'Many');
    });

    it('returns other for 0.5', function() {
      var value = Resolver.format({n: 0.5}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

  });

  describe('an entity without the many form', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[other]=Other'
      ].join('\n');
    });

    it('returns other for 0', function() {
      var value = Resolver.format({n: 0}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('returns other for 1', function() {
      var value = Resolver.format({n: 1}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('returns other for 2', function() {
      var value = Resolver.format({n: 2}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('returns other for 3', function() {
      var value = Resolver.format({n: 3}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('returns other for 5', function() {
      var value = Resolver.format({n: 5}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

    it('returns other for 0.5', function() {
      var value = Resolver.format({n: 0.5}, env.foo)[1];
      assert.strictEqual(value, 'Other');
    });

  });

  describe('an entity without the other form, but with the one ' +
           'form', function(){

    before(function() {
      source = [
        'foo={[ plural(n) ]}',
        'foo[one]=One'
      ].join('\n');
    });

    it('throws for 0', function() {
      assert.throws(function() {
        Resolver.format({n: 0}, env.foo);
      }, 'Unresolvable value');
    });

    it('returns one for 1', function() {
      var value = Resolver.format({n: 1}, env.foo)[1];
      assert.strictEqual(value, 'One');
    });

    it('throws for 2', function() {
      assert.throws(function() {
        Resolver.format({n: 2}, env.foo);
      }, 'Unresolvable value');
    });

    it('throws for 3', function() {
      assert.throws(function() {
        Resolver.format({n: 3}, env.foo);
      }, 'Unresolvable value');
    });

    it('throws for 5', function() {
      assert.throws(function() {
        Resolver.format({n: 5}, env.foo);
      }, 'Unresolvable value');
    });

    it('throws for 0.5', function() {
      assert.throws(function() {
        Resolver.format({n: 0.5}, env.foo);
      }, 'Unresolvable value');
    });

  });

});
