/* global it, assert:true, describe, beforeEach */
/* global window, navigator, process, __dirname */
'use strict';

var assert = require('assert') || window.assert;

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Context = L10n.Context;
  var path =
    'app://sharedtest.gaiamobile.org/test/unit/l10n/lib/context';
} else {
  var Context = process.env.L20N_COV ?
    require('../../../build/cov/lib/l20n/context').Context
    : require('../../../lib/l20n/context').Context;
  var path = __dirname;
}

describe('A non-loading context', function() {
  var ctx;

  beforeEach(function() {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/{{locale}}.properties');
  });

  it('should throw on get', function() {
    assert.throws(function(){
      ctx.get('dummy');
    }, /Context not ready/);
  });

  it('should throw on getEntity', function() {
    assert.throws(function(){
      ctx.getEntity('dummy');
    }, /Context not ready/);
  });

});

describe('A loading, non-ready context', function() {
  var ctx;
  beforeEach(function() {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/{{locale}}.properties');
    ctx.requestLocales();
  });

  it('should throw on requestLocales', function() {
    assert.throws(function(){
      ctx.requestLocales();
    }, /Context not ready/);
  });

  it('should throw on get', function() {
    assert.throws(function(){
      ctx.get('dummy');
    }, /Context not ready/);
  });

  it('should throw on getEntity', function() {
    assert.throws(function(){
      ctx.getEntity('dummy');
    }, /Context not ready/);
  });

  it('should throw on requestLocales', function() {
    assert.throws(function(){
      ctx.requestLocales('en-US');
    }, /Context not ready/);
  });

});

describe('A loading, ready context', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/{{locale}}.properties');
    ctx.once(done);
    ctx.requestLocales();
  });

  it('should not throw on get of a known entity', function() {
    assert.doesNotThrow(function(){
      ctx.get('foo');
    });
    assert.strictEqual(ctx.get('foo'), 'Foo en-US');
  });

  it('should not throw on get of an unknown entity', function() {
    assert.doesNotThrow(function(){
      ctx.get('missing');
    });
    assert.strictEqual(ctx.get('missing'), '');
  });

  it('should not throw on getEntity of a known entity', function() {
    assert.doesNotThrow(function(){
      ctx.getEntity('foo');
    });
    assert.strictEqual(ctx.getEntity('foo'), 'Foo en-US');
  });

  it('should not throw on getEntity of an unknown entity', function() {
    assert.doesNotThrow(function(){
      ctx.getEntity('missing');
    });
    assert.strictEqual(ctx.getEntity('missing'), null);
  });

  it('should not throw on requestLocales', function(done) {
    ctx.once(function() {
      assert.strictEqual(ctx.isReady, true);
      done();
    });
    assert.doesNotThrow(function(){
      ctx.requestLocales('pl');
    });
  });

});

describe('A loading, ready context', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/{{locale}}.properties');
    ctx.once(done);
    ctx.requestLocales('en-US');
  });

  it('should return translations for the built fallback chain ', function() {
    // Bug 942183 - Error when localizeNode is done quickly after
    // requestLocales https://bugzil.la/942183
    // Changing locales triggers the build process for the 'pl' locale.
    // However, synchronous methods called right after the change should still
    // return translations for the previous fallback chain
    ctx.requestLocales('pl');
    assert.strictEqual(ctx.get('foo'), 'Foo en-US');
  });

});
