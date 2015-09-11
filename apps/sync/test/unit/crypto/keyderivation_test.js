/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  expect,
  KeyDerivation,
  FxSyncWebCryptoFixture,
  requireApp,
  suite,
  test
*/

requireApp('sync/js/crypto/stringconversion.js');
requireApp('sync/js/crypto/keyderivation.js');
requireApp('sync/js/crypto/main.js');
requireApp('sync/test/unit/fixtures/fxsyncwebcrypto.js');

suite('hkdf', () => {
  suite('hkdf', () => {
    test('can calculate a hkdf result correctly', done => {
      const fixture = FxSyncWebCryptoFixture.hkdf;
      KeyDerivation.hkdf(fixture.kB, fixture.infoStr, new Uint8Array(64), 64).
          then(function(bytes) {
        var hex = '';
        for (var i=0; i <bytes.length; ++i) {
          const zeropad = (bytes[i] < 0x10) ? '0' : '';
          hex += zeropad + bytes[i].toString(16);
        }
        expect(hex).to.equal(fixture.outputHex);
        done();
      });
    });
    test('rejects its promise if ikm is wrong', done => {
      const fixture = FxSyncWebCryptoFixture.hkdf;
      fixture.kB = 'foo';
      const promise = KeyDerivation.hkdf(fixture.kB, fixture.infoStr,
          new Uint8Array(64), 64);
      expect(promise).to.be.rejectedWith(Error).and.notify(done);
    });
    test('rejects its promise if info is wrong', done => {
      const fixture = FxSyncWebCryptoFixture.hkdf;
      fixture.kB = 'foo';
      const promise = KeyDerivation.hkdf(fixture.kB, fixture.infoStr,
                                       new Uint8Array(64), 64);
      expect(promise).to.be.rejectedWith(Error).and.notify(done);
    });
    test('rejects its promise if salt is wrong', done => {
      const fixture = FxSyncWebCryptoFixture.hkdf;
      fixture.kB = 'foo';
      const promise = KeyDerivation.hkdf(fixture.kB, fixture.infoStr,
                                       new Uint8Array(64), 64);
      expect(promise).to.be.rejectedWith(Error).and.notify(done);
    });
    test('rejects its promise if length is wrong', done => {
      const fixture = FxSyncWebCryptoFixture.hkdf;
      const promise = KeyDerivation.hkdf(fixture.kB, fixture.infoStr,
                                       new Uint8Array(64), 32);
      expect(promise).to.be.rejectedWith(Error).and.notify(done);
    });
  });
});
