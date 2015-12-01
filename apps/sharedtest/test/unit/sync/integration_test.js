/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


'use strict';

/* global
  FxSyncWebCryptoFixture,
  MocksHelper,
  MockIACPort,
  MockasyncStorage,
  MockDatastore,
  MockNavigatorDatastore,
  SynctoServerFixture
*/


requireApp('system/test/unit/mock_iac_handler.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/shared/js/sync/bootstrap.js');
require('/shared/js/sync/engine.js');
require('/shared/js/sync/errors.js');
require('/shared/js/sync/crypto/stringconversion.js');
require('/shared/js/sync/crypto/keyderivation.js');
require('/shared/js/sync/crypto/fxsyncwebcrypto.js');
require('/shared/js/sync/ext/kinto.min.js');

requireApp('sync/js/adapters/history.js');
requireApp('sync/js/adapters/bookmarks.js');

requireApp('sharedtest/test/unit/sync/fixtures/synctoserver.js');
requireApp('sharedtest/test/unit/sync/fixtures/fxsyncwebcrypto.js');

var mocksForBootstrap = new MocksHelper([
  'IACHandler',
  'IACPort',
  'LazyLoader'
]).init();

suite('Sync app', function() {
  mocksForBootstrap.attachTestHelpers();

  suite('Sync request', function() {
    const IAC_EVENT = 'iac-gaia::sync::request';

    var fetchStub, realFetch, LazyLoader, realGetDataStores, realAsyncStorage;
    var addEventListenerSpy, consoleErrorSpy, postMessageSpy, closeStub,
        windowClosedPromise, dataStoreSpy;

    setup(function() {
      addEventListenerSpy = sinon.spy(window, 'addEventListener');

      realAsyncStorage = window.asyncStorage;
      window.asyncStorage = MockasyncStorage;

      consoleErrorSpy = sinon.spy(console, 'error');
      postMessageSpy = sinon.spy(MockIACPort, 'postMessage');
      closeStub = sinon.stub(window, 'close', () => {
        if (windowClosedPromise) {
          windowClosedPromise.resolve();
        }
      });
      LazyLoader = {
        load() {
          return Promise.resolve();
        }
      };

      realGetDataStores = navigator.getDataStores;
      navigator.getDataStores = MockNavigatorDatastore.getDataStores;
      dataStoreSpy = sinon.spy(navigator, 'getDataStores');

      realFetch = window.fetch;
      // Spying directly on window.fetch is not allowed, so wrapping it in an
      // anonymous function first.
      fetchStub = this.sinon.spy(function() {
        if (fetchStub.mockUnreachable) {
          return Promise.resolve(SynctoServerFixture.responses.unreachable);
        } else {
          return Promise.resolve(SynctoServerFixture.responses[arguments[0]]);
        }
      });
      window.fetch = fetchStub;
    });

    teardown(function() {
      addEventListenerSpy.restore();
      window.asyncStorage.mTeardown();
      window.asyncStorage = realAsyncStorage;
      consoleErrorSpy.restore();
      postMessageSpy.restore();
      dataStoreSpy.restore();
      navigator.getDataStores = realGetDataStores;
      window.fetch = realFetch;
      closeStub.restore();
      windowClosedPromise = null;
    });

    function windowClosed() {
      if (closeStub.called) {
        return Promise.resolve();
      }
      return new Promise(resolve => {
        windowClosedPromise = { resolve };
      });
    }

    function clearSyncAppData(kB) {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id,
          name: 'clear',
          URL: '',
          assertion: '',
          keys: { kB },
          collections: {
            history: {},
            bookmarks: {}
          }
        }
      }));
      return windowClosed();
    }

    test('invalid sync request', function(done) {
      window.dispatchEvent(new CustomEvent(IAC_EVENT));
      windowClosed().then(() => {
        expect(fetchStub.called).to.equal(false);
        done();
      });
    });


    test('url without version', function(done) {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id,
          name: 'sync',
          URL: 'url',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: {
            history: { readOnly: true }
          }
        }
      }));
      windowClosed().then(() => {
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error.message).to.equal(`The remote UR\
L must contain the version: url`);
        done();
      });
    });

  test('server unreachable', function(done) {
    fetchStub.mockUnreachable = true;
    var id = Date.now();
    window.dispatchEvent(new CustomEvent(IAC_EVENT, {
      detail: {
        id,
        name: 'sync',
        URL: 'http://example.com/v1/',
        assertion: 'assertion',
        keys: { kB: 'kB' },
        collections: {
          history: { readOnly: true }
        }
      }
    }));
    windowClosed().then(() => {
      expect(postMessageSpy.called).to.equal(true);
      expect(postMessageSpy.args[0][0].id).to.equal(id);
      expect(postMessageSpy.args[0][0].error.message).to.equal(`try later`);
      fetchStub.mockUnreachable = false;
      clearSyncAppData('kB').then(done);
    });
  });

    test('bogus server response', function(done) {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id,
          name: 'sync',
          URL: 'http://example.com/v1/',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: {
            history: { readOnly: true }
          }
        }
      }));
      windowClosed().then(() => {
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error.message).to.equal(`try later`);
        clearSyncAppData('kB').then(done, done);
      });
    });

    test('sync zero collections', function(done) {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id,
          name: 'sync',
          URL: 'https://syncto.dev.mozaws.net/v1/',
          assertion: 'assertion',
          keys: { kB: FxSyncWebCryptoFixture.kB },
          collections: {
          }
        }
      }));

      windowClosed().then(() => {
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error).to.equal(undefined);
        var fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
            ['meta']);
        expect(fetchStub.args.length).to.equal(fetchArgsExpected.length);
        for (var i = 0; i < fetchStub.args.length; i++) {
          expect(fetchStub.args[i].length).to.equal(
              fetchArgsExpected[i].length);
          for (var j = 0; j < fetchStub.args[i].length; j++) {
            expect(fetchStub.args[i][j]).to.deep.equal(
                fetchArgsExpected[i][j]);
          }
        }
        return clearSyncAppData(FxSyncWebCryptoFixture.kB).then(done, done);
      });
    });

    test('sync history', function(done) {
      // TODO: Test known tombstones, unknown tombstones, updates, quota errors.
      // Leaving race conditions for now, since on the TV the sync app is the
      // only one to write to the places DS.

      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id,
          name: 'sync',
          URL: 'https://syncto.dev.mozaws.net/v1/',
          assertion: 'assertion',
          keys: { kB: FxSyncWebCryptoFixture.kB },
          collections: {
            history: { readonly: true }
          }
        }
      }));

      windowClosed().then(() => {
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error).to.equal(undefined);
        var fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
            ['meta', 'crypto', 'history']);
        // FIXME: We are not mocking IndexedDB, so it's possible the crypto
        // collection was cached in the test environment and does not get
        // fetched.
        if (fetchStub.args.length == 3) {
          fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
            ['meta', 'history']);
        }
        expect(fetchStub.args.length).to.equal(fetchArgsExpected.length);
        for (var i = 0; i < fetchStub.args.length; i++) {
          expect(fetchStub.args[i].length).to.equal(
              fetchArgsExpected[i].length);
          for (var j = 0; j < fetchStub.args[i].length; j++) {
            expect(fetchStub.args[i][j]).to.deep.equal(
                fetchArgsExpected[i][j]);
          }
        }
        expect(MockasyncStorage.mItems[`518fef27c6bbc0220aab0f00b1a37308::\
synctoid::history::_9sCUbahs0ay`]).to.equal(`https://developer.mozilla.org/en-U\
S/docs/Web/JavaScript/Reference/Global_Objects/Object/proto`);
        expect(MockasyncStorage.mItems[`518fef27c6bbc0220aab0f00b1a37308::\
collections::history::mtime`]).to.equal(1234567890123);

        return Promise.all([
          // FIXME: Can only mock one DataStore per test
          navigator.getDataStores('places').then(stores => {
            var recordKeys = Object.keys(stores[0]._records);
            expect(recordKeys.length).to.equal(1);
            expect(recordKeys[0]).to.equal(`https://developer.mozilla.org/en-US\
/docs/Web/JavaScript/Reference/Global_Objects/Object/proto`);
            expect(stores[0]._records[`https://developer.mozilla.org/en-US/docs\
/Web/JavaScript/Reference/Global_Objects/Object/proto`]).to.deep.equal({
              url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/R\
eference/Global_Objects/Object/proto`,
              title: 'Object.prototype.__proto__ € - JavaScript | MDN',
              visits: [ 1439366063808 ],
              fxsyncId: '_9sCUbahs0ay',
              createdLocally: false
            });
          })
        ]);
      }).then(() => undefined).then(() => {
        return clearSyncAppData(FxSyncWebCryptoFixture.kB);
      }).then(done, done);
    });

    test('sync bookmarks', function(done) {
      // TODO: Test known tombstones, unknown tombstones, updates, quota errors.
      // Leaving race conditions for now, since on the TV the sync app is the
      // only one to write to the bookmarks_store DS.

      MockDatastore._tasks[1].revisionId = '{new-revision-id}';
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id,
          name: 'sync',
          URL: 'https://syncto.dev.mozaws.net/v1/',
          assertion: 'assertion',
          keys: { kB: FxSyncWebCryptoFixture.kB },
          collections: {
            bookmarks: { readonly: true }
          }
        }
      }));

      windowClosed().then(() => {
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error).to.equal(undefined);
        var fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
            ['meta', 'crypto', 'bookmarks']);
        // FIXME: We are not mocking IndexedDB, so it's possible the crypto
        // collection was cached in the test environment and does not get
        // fetched.
        if (fetchStub.args.length == 3) {
          fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
            ['meta', 'bookmarks']);
        }
        expect(fetchStub.args.length).to.equal(fetchArgsExpected.length);
        for (var i = 0; i < fetchStub.args.length; i++) {
          expect(fetchStub.args[i].length).to.equal(
              fetchArgsExpected[i].length);
          for (var j = 0; j < fetchStub.args[i].length; j++) {
            expect(fetchStub.args[i][j]).to.deep.equal(
                fetchArgsExpected[i][j]);
          }
        }
        expect(MockasyncStorage.mItems)
            .to.deep.equal(SynctoServerFixture.bookmarksExpectedAsyncStorage);

        return Promise.all([
          navigator.getDataStores('bookmarks_store').then(stores => {
            expect(stores[0]._records).to.deep.equal(
                SynctoServerFixture.bookmarksExpectedDataStore);
          })
        ]);
      }).then(() => undefined).then(() => {
        return clearSyncAppData(FxSyncWebCryptoFixture.kB);
      }).then(done, done);
    });

    suite('collection not in meta/global engines', function() {
      setup(function() {
        SynctoServerFixture.remoteData.meta.payload =
          SynctoServerFixture.metaGlobalPayloadWithoutHistoryEngine;
      });
      teardown(function() {
        SynctoServerFixture.remoteData.meta.payload =
          SynctoServerFixture.metaGlobalPayloadWithHistoryEngine;
      });

      test('skips that collection', function(done) {
        var id = Date.now();
        window.dispatchEvent(new CustomEvent(IAC_EVENT, {
          detail: {
            id,
            name: 'sync',
            URL: 'https://syncto.dev.mozaws.net/v1/',
            assertion: 'assertion',
            keys: { kB: FxSyncWebCryptoFixture.kB },
            collections: {
              history: { readonly: true }
            }
          }
        }));

        windowClosed().then(() => {
          expect(postMessageSpy.called).to.equal(true);
          expect(postMessageSpy.args[0][0].id).to.equal(id);
          expect(postMessageSpy.args[0][0].error).to.equal(undefined);
          var fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
              ['meta', 'crypto']);
          // FIXME: We are not mocking IndexedDB, so it's possible the crypto
          // collection was cached in the test environment and does not get
          // fetched.
          if (fetchStub.args.length == 2) {
            fetchArgsExpected = SynctoServerFixture.fetchArgsExpected(
              ['meta']);
          }
          expect(fetchStub.args.length).to.equal(fetchArgsExpected.length);
          for (var i = 0; i < fetchStub.args.length; i++) {
            expect(fetchStub.args[i].length).to.equal(
                fetchArgsExpected[i].length);
            for (var j = 0; j < fetchStub.args[i].length; j++) {
              expect(fetchStub.args[i][j]).to.deep.equal(
                  fetchArgsExpected[i][j]);
            }
          }
          return clearSyncAppData(FxSyncWebCryptoFixture.kB).then(done, done);
        });
      });
    });
  });
});
