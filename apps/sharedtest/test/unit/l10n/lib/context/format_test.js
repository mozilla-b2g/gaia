/* global assert:true, it, describe, beforeEach */
/* global navigator, __dirname */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Context = L10n.Context;
  var path =
    'app://sharedtest.gaiamobile.org/test/unit/l10n/lib/context';
} else {
  var assert = require('assert');
  var Context = require('../../../src/lib/context').Context;
  var path = __dirname;
}

function assertPromise(promise, expected, done) {
  promise.then(function(value) {
    assert.strictEqual(value, expected);
  }).then(done, done);
}

describe('One fallback locale', function() {
  var ctx;

  beforeEach(function(done) {
    ctx = new Context();
    ctx.resLinks.push(path + '/fixtures/{locale}.properties');
    ctx.once(done);
    ctx.registerLocales('en-US', ['pl']);
    ctx.requestLocales('pl');
  });

  describe('Translation in the first locale exists and is OK', function() {
    it('[e]', function(done) {
      assertPromise(ctx.formatValue('e'), 'E pl', done);
    });
  });

  describe('ValueError in first locale', function() {
    describe('Entity exists in second locale:', function() {
      it('[ve]', function(done) {
        assertPromise(ctx.formatValue('ve'), 'VE {{ boo }} pl', done);
      });
    });

    describe('ValueError in second locale:', function() {
      it('[vv]', function(done) {
        assertPromise(ctx.formatValue('vv'), 'VV {{ boo }} pl', done);
      });
    });

    describe('IndexError in second locale:', function() {
      it('[vi]', function(done) {
        assertPromise(ctx.formatValue('vi'), 'VI {{ boo }} pl', done);
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[vm]', function(done) {
        assertPromise(ctx.formatValue('vm'), 'VM {{ boo }} pl', done);
      });
    });
  });

  describe('IndexError in first locale', function() {
    describe('Entity exists in second locale', function() {
      it('[ie]', function(done) {
        assertPromise(ctx.formatValue('ie'), 'ie', done);
      });
    });

    describe('ValueError in second locale', function() {
      it('[iv]', function(done) {
        assertPromise(ctx.formatValue('iv'), 'iv', done);
      });
    });

    describe('IndexError in second locale', function() {
      it('[ii]', function(done) {
        assertPromise(ctx.formatValue('ii'), 'ii', done);
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[im]', function(done) {
        assertPromise(ctx.formatValue('im'), 'im', done);
      });
    });
  });

  describe('Entity not found in first locale', function() {
    describe('Entity exists in second locale:', function() {
      it('[me]', function(done) {
        assertPromise(ctx.formatValue('me'), 'ME en-US', done);
      });
    });

    describe('ValueError in second locale:', function() {
      it('[mv]', function(done) {
        assertPromise(ctx.formatValue('mv'), 'MV {{ boo }} en-US', done);
      });
    });

    describe('IndexError in second locale:', function() {
      it('[mi]', function(done) {
        assertPromise(ctx.formatValue('mi'), 'mi', done);
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[mm]', function(done) {
        assertPromise(ctx.formatValue('mm'), 'mm', done);
      });
    });
  });
});
