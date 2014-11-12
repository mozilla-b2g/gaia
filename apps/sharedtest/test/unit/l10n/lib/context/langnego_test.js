/* global assert:true, it, describe, beforeEach */
/* global navigator, process */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Context = L10n.Context;
} else {
  var assert = require('assert');
  var Context = process.env.L20N_COV ?
    require('../../../build/cov/lib/l20n/context').Context
    : require('../../../lib/l20n/context').Context;
}

describe('Language negotiation without arguments', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.once(done);
    ctx.registerLocales('en-US');
    ctx.requestLocales('en-US');
  });

  it('used the en-US locale', function() {
    assert.strictEqual(ctx.supportedLocales.length, 1);
    assert.strictEqual(ctx.supportedLocales[0], 'en-US');
  });
});

describe('Language negotiation with arguments', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.once(done);
    ctx.registerLocales('en-US', ['pl']);
    ctx.requestLocales('pl');
  });

  it('sets the correct fallback chain', function() {
    assert.strictEqual(ctx.supportedLocales.length, 2);
    assert.strictEqual(ctx.supportedLocales[0], 'pl');
    assert.strictEqual(ctx.supportedLocales[1], 'en-US');
  });
});
