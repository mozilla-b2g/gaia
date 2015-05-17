/* global assert:true, it, describe, beforeEach */
/* global navigator, __dirname */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Context = L10n.Context;
  var path = 'app://sharedtest.gaiamobile.org/test/unit/l10n/context';
} else {
  var assert = require('assert');
  var Context = require('../../../src/lib/context').Context;
  var path = __dirname;
}

describe('Missing resources', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/en-US.properties');
    ctx.resLinks.push(path + '/fixtures/missing.properties');
    ctx.once(done);
    ctx.registerLocales('en-US');
    ctx.requestLocales('en-US');
  });

  it('should get ready', function() {
    assert.strictEqual(ctx.isReady, true);
  });

});

describe('No valid resources', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/missing.properties');
    ctx.resLinks.push(path + '/fixtures/another.properties');
    ctx.once(done);
    ctx.registerLocales('en-US');
    ctx.requestLocales('en-US');
  });

  it('should get ready', function() {
    assert.strictEqual(ctx.isReady, true);
  });

});
