'use strict';
var assert = require('assert');
var fsPath = require('path');
var subject = require('../lib/detectbinary').detectBinary;

suite('detectbinary', function() {
  var platforms = {
    mac: {
      path: __dirname + '/fixtures/product-mac',
      suffix: '/Contents/MacOS',
      platform: 'darwin',
      product: 'firefox'
    },
    noBinMac: {
      path: __dirname + '/fixtures/product-mac-no-bin',
      suffix: '/Contents/MacOS',
      platform: 'darwin',
      product: 'firefox'
    },
    linux: {
      path: __dirname + '/fixtures/product-linux',
      suffix: '',
      platform: 'linux-bs',
      product: 'firefox'
    },
    noBinLinux: {
      path: __dirname + '/fixtures/product-linux-no-bin',
      suffix: '',
      platform: 'linux-bs',
      product: 'firefox'
    }
  };

  function fixturePath(fixture, bin) {
    fsPath.join(
      fixture.path,
      fixture.suffix,
      bin
    );
  }

  function verify(name, fixture, bin) {
    test(name, function(done) {
      subject(fixture.path, fixture, function(err, path) {
        if (err) return done(err);
        assert.equal(fixturePath(fixture, bin));
        done();
      });
    });
  }

  verify('mac with -bin', platforms.mac, 'firefox-bin');
  verify('mac without -bin', platforms.noBinMac, 'firefox');
  verify('linux with -bin', platforms.linux, 'firefox-bin');
  verify('linux without -bin', platforms.noBinLinux, 'firefox');

  test('missing binary', function(done) {
    subject(__dirname, { product: 'firefox', bin: 'nothere' }, function(err) {
      assert.ok(err, 'has error');
      assert.ok(err.message.indexOf(__dirname) !== 0, 'contains path');
      done();
    });
  });

});
