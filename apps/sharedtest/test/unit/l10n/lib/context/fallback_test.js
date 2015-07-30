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
    it('[e]', function() {
      assert.strictEqual(ctx.get('e'), 'E pl');
    });
  });

  describe('ValueError in first locale', function() {
    describe('Entity exists in second locale:', function() {
      it('[ve]', function() {
        assert.strictEqual(ctx.get('ve'), 'VE {{ boo }} pl');
      });
    });

    describe('ValueError in second locale:', function() {
      it('[vv]', function() {
        assert.strictEqual(ctx.get('vv'), 'VV {{ boo }} pl');
      });
    });

    describe('IndexError in second locale:', function() {
      it('[vi]', function() {
        assert.strictEqual(ctx.get('vi'), 'VI {{ boo }} pl');
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[vm]', function() {
        assert.strictEqual(ctx.get('vm'), 'VM {{ boo }} pl');
      });
    });
  });

  describe('IndexError in first locale', function() {
    describe('Entity exists in second locale', function() {
      it('[ie]', function() {
        assert.strictEqual(ctx.get('ie'), 'ie');
      });
    });

    describe('ValueError in second locale', function() {
      it('[iv]', function() {
        assert.strictEqual(ctx.get('iv'), 'iv');
      });
    });

    describe('IndexError in second locale', function() {
      it('[ii]', function() {
        assert.strictEqual(ctx.get('ii'), 'ii');
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[im]', function() {
        assert.strictEqual(ctx.get('im'), 'im');
      });
    });
  });

  describe('Entity not found in first locale', function() {
    describe('Entity exists in second locale:', function() {
      it('[me]', function() {
        assert.strictEqual(ctx.get('me'), 'ME en-US');
      });
    });

    describe('ValueError in second locale:', function() {
      it('[mv]', function() {
        assert.strictEqual(ctx.get('mv'), 'MV {{ boo }} en-US');
      });
    });

    describe('IndexError in second locale:', function() {
      it('[mi]', function() {
        assert.strictEqual(ctx.get('mi'), 'mi');
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[mm]', function() {
        assert.strictEqual(ctx.get('mm'), '');
      });
    });
  });
});
