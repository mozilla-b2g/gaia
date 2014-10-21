/* global assert:true, it, describe, beforeEach */
/* global navigator, process, __dirname */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Context = L10n.Context;
  var path =
    'app://sharedtest.gaiamobile.org/test/unit/l10n/lib/context';
} else {
  var assert = require('assert');
  var Context = process.env.L20N_COV ?
    require('../../../build/cov/lib/l20n/context').Context
    : require('../../../lib/l20n/context').Context;
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
      var entity = ctx.getEntity('e');
      assert.strictEqual(entity, 'E pl');
    });
  });

  describe('ValueError in first locale', function() {
    describe('Entity exists in second locale:', function() {
      it('[ve]', function() {
        var entity = ctx.getEntity('ve');
        assert.strictEqual(entity, 'VE {{ boo }} pl');
      });
    });

    describe('ValueError in second locale:', function() {
      it('[vv]', function() {
        var entity = ctx.getEntity('vv');
        assert.strictEqual(entity, 'VV {{ boo }} pl');
      });
    });

    describe('IndexError in second locale:', function() {
      it('[vi]', function() {
        var entity = ctx.getEntity('vi');
        assert.strictEqual(entity, 'VI {{ boo }} pl');
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[vm]', function() {
        var entity = ctx.getEntity('vm');
        assert.strictEqual(entity, 'VM {{ boo }} pl');
      });
    });
  });

  describe('IndexError in first locale', function() {
    describe('Entity exists in second locale', function() {
      it('[ie]', function() {
        var entity = ctx.getEntity('ie');
        assert.strictEqual(entity, undefined);
      });
    });

    describe('ValueError in second locale', function() {
      it('[iv]', function() {
        var entity = ctx.getEntity('iv');
        assert.strictEqual(entity, undefined);
      });
    });

    describe('IndexError in second locale', function() {
      it('[ii]', function() {
        var entity = ctx.getEntity('ii');
        assert.strictEqual(entity, undefined);
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[im]', function() {
        var entity = ctx.getEntity('im');
        assert.strictEqual(entity, undefined);
      });
    });
  });

  describe('Entity not found in first locale', function() {
    describe('Entity exists in second locale:', function() {
      it('[me]', function() {
        var entity = ctx.getEntity('me');
        assert.strictEqual(entity, 'ME en-US');
      });
    });

    describe('ValueError in second locale:', function() {
      it('[mv]', function() {
        var entity = ctx.getEntity('mv');
        assert.strictEqual(entity, 'MV {{ boo }} en-US');
      });
    });

    describe('IndexError in second locale:', function() {
      it('[mi]', function() {
        var entity = ctx.getEntity('mi');
        assert.strictEqual(entity, undefined);
      });
    });

    describe('Entity missing in second locale:', function() {
      it('[mm]', function() {
        var entity = ctx.getEntity('mm');
        assert.strictEqual(entity, null);
      });
    });
  });
});
