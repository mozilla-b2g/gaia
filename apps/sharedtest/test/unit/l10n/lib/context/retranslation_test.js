/* global it, describe, beforeEach */
/* global navigator, process */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Context = L10n.Context;
} else {
  var Context = process.env.L20N_COV ?
    require('../../../build/cov/lib/l20n/context').Context
    : require('../../../lib/l20n/context').Context;
}

describe('ctx.ready', function() {
  var ctx;

  beforeEach(function() {
    ctx = new Context();
  });

  it('should fire asynchronously when context is ready', function(done) {
    ctx.ready(function() {
      done();
    });
    ctx.requestLocales('pl');
  });

  it('should fire asynchronously when language changes', function(done) {
    var now = false;
    ctx.ready(function() {
      if (now) {
        done();
      }
    });
    ctx.once(function() {
      now = true;
      ctx.requestLocales('pl');
    });
    ctx.requestLocales('en-US');
  });

  it('should fire synchronously when context is ready', function(done) {
    ctx.once(function() {
      ctx.ready(function() {
        done();
      });
    });
    ctx.requestLocales('en-US');
  });

  it('should fire synchronously when language changes', function(done) {
    var now = false;
    ctx.once(function() {
      ctx.ready(function() {
        if (now) {
          done();
        }
      });
      setTimeout(function() {
        now = true;
        ctx.requestLocales('pl');
      });
    });
    ctx.requestLocales('en-US');
  });

});
