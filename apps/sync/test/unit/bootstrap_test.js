/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


'use strict';

/* global
  Bootstrap,
  BootstrapFixture,
  DataAdapters,
  ERROR_SYNC_APP_SYNC_IN_PROGRESS,
  ERROR_SYNC_INVALID_REQUEST_OPTIONS,
  expect,
  MockLazyLoader,
  MockSyncEngine,
  require,
  requireApp,
  setup,
  suite,
  test
*/


require('/shared/js/sync/errors.js');
requireApp('sync/test/unit/fixtures/bootstrap.js');
requireApp('sync/test/unit/improved_mock_lazy_loader.js');
requireApp('sync/js/bootstrap.js');
requireApp('sync/test/unit/sync-engine-mock.js');

suite('Bootstrap', function() {
  this.timeout(100);
  suite('when script is loaded', () => {
    test('DataAdapters global is exposed', function() {
      expect(DataAdapters).to.be.an('object');
    });
  });

  suite('Bootstrap.handleSyncRequest', function() {
    setup(function() {
      window.LazyLoader = MockLazyLoader;
      window.SyncEngine = MockSyncEngine;
    });

    function run(shouldFail = false) {
      MockSyncEngine.shouldFail = shouldFail;
      return Bootstrap.handleSyncRequest({
        assertion: 'test-assertion',
        keys: { kA: 'test-kA', kB: 'test-kB' },
        collections: {
          'test-collection': {}
        },
        URL: 'test-URL'
      });
    }

    function buildRequest() {
      return {
        URL: 'is a string',
        assertion: 'is a string',
        keys: {
          kA: 'is a string',
          kB: 'is a string'
        },
        collections: {
          foo: {}
        }
      };
    }

    test('checks request is an object', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      expect(Bootstrap.handleSyncRequest()).to.be
          .rejectedWith(ERROR_SYNC_INVALID_REQUEST_OPTIONS)
          .and.notify(function(err) {
            expect(spy.args[0][0]).to.equal('shared/js/sync/errors.js');
            done(err);
          });
    });

    test('checks request.URL is a string', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      var request = buildRequest();
      delete request.URL;
      expect(Bootstrap.handleSyncRequest()).to.be
          .rejectedWith(ERROR_SYNC_INVALID_REQUEST_OPTIONS)
          .and.notify(function(err) {
            expect(spy.args[0][0]).to.equal('shared/js/sync/errors.js');
            done(err);
          });
    });

    test('checks request.assertion is a string', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      var request = buildRequest();
      delete request.assertion;
      expect(Bootstrap.handleSyncRequest()).to.be
          .rejectedWith(ERROR_SYNC_INVALID_REQUEST_OPTIONS)
          .and.notify(function(err) {
            expect(spy.args[0][0]).to.equal('shared/js/sync/errors.js');
            done(err);
          });
    });

    test('checks request.keys.kB is a string', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      var request = buildRequest();
      delete request.keys.kB;
      expect(Bootstrap.handleSyncRequest()).to.be
          .rejectedWith(ERROR_SYNC_INVALID_REQUEST_OPTIONS)
          .and.notify(function(err) {
            expect(spy.args[0][0]).to.equal('shared/js/sync/errors.js');
            done(err);
          });
    });

    test('checks request.collections is an object (not Array)', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      var request = buildRequest();
      request.collections = [ 'foo' ];
      expect(Bootstrap.handleSyncRequest()).to.be
          .rejectedWith(ERROR_SYNC_INVALID_REQUEST_OPTIONS)
          .and.notify(function(err) {
            expect(spy.args[0][0]).to.equal('shared/js/sync/errors.js');
            done(err);
          });
    });

    test('loads main scripts', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      run().then(function() {
        expect(spy.args[0][0]).to.deep.equal(BootstrapFixture.mainScripts);
        done();
      });
    });

    test('loads DataAdapter scripts', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      run().then(function() {
        expect(spy.args[1][0]).to.deep.equal('js/adapters/test-collection.js');
        done();
      });
    });

    test('constructs SyncEngine', function(done) {
      run().then(() => {
        expect(MockSyncEngine.constructorOptions).to.deep.equal({
          kB: 'test-kB',
          URL: 'test-URL',
          assertion: 'test-assertion',
          adapters: DataAdapters
        });
        done();
      });
    });

    test('calls SyncEngine#syncNow', function(done) {
      run().then(() => {
        expect(MockSyncEngine.syncOptions).to.deep.equal({
          'test-collection': {}
        });
        done();
      });
    });

    test('will report failures', function(done) {
      expect(run(true)).to.be.rejectedWith('mock sync failure')
          .and.notify(done);
    });

    test('will run only once at a time', function(done) {
      var spy = this.sinon.spy(MockLazyLoader, 'load');
      var firstSucceeded = false;
      var secondFailed = false;
      run().then(() => {
        firstSucceeded = true;
        if (secondFailed) {
          done();
        }
      });
      run().catch(err => {
        expect(spy.withArgs('shared/js/sync/errors.js').called).to.equal(true);
        expect(err.message).to.equal(ERROR_SYNC_APP_SYNC_IN_PROGRESS);
        secondFailed = true;
        if (firstSucceeded) {
          done();
        }
      });
    });

    test('will run again after success', function(done) {
      run().then(() => {
        expect(run()).to.eventually.equal(undefined).and.notify(done);
      });
    });

    test('will run again after failure', function(done) {
      run(true).catch(err => {
        expect(err.message).to.equal('mock sync failure');
        return run();
      }).then(done);
    });
  });
});
