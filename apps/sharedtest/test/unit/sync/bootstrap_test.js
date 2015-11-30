/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


'use strict';

/* global
  Bootstrap,
  BootstrapFixture,
  DataAdapters,
  ERROR_SYNC_APP_SYNC_IN_PROGRESS,
  ERROR_SYNC_INVALID_REQUEST_OPTIONS,
  MocksHelper,
  MockIACPort,
  MockLazyLoader,
  MockSyncEngine
*/


require('/shared/js/sync/errors.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_iac_handler.js');
requireApp('sharedtest/test/unit/sync/fixtures/bootstrap.js');
requireApp('sharedtest/test/unit/sync/sync-engine-mock.js');

var mocksForBootstrap = new MocksHelper([
  'IACHandler',
  'IACPort',
  'LazyLoader',
  'SyncEngine'
]).init();

suite('Bootstrap', function() {
  mocksForBootstrap.attachTestHelpers();

  suite('when script is loaded', function() {
    var addEventListenerSpy;

    suiteSetup(function(done) {
      addEventListenerSpy = sinon.spy(window, 'addEventListener');
      // The other suites rely on this suite running first for bootstrap.js
      // to be loaded.
      require('/shared/js/sync/bootstrap.js', done);
    });

    suiteTeardown(function() {
      addEventListenerSpy.restore();
    });

    test('DataAdapters global is exposed', function() {
      expect(DataAdapters).to.be.an('object');
    });

    test('IAC event listener is set', function() {
      expect(addEventListenerSpy.called).to.equal(true);
      expect(addEventListenerSpy.args[0][0]).to.equal(
        'iac-gaia::sync::request'
      );
    });
  });

  suite('Bootstrap.handleSyncRequest', function() {
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

  suite('IAC request', () => {
    const IAC_EVENT = 'iac-gaia::sync::request';

    var consoleErrorSpy;
    var postMessageSpy;
    var closeStub;

    setup(function() {
      consoleErrorSpy = sinon.spy(console, 'error');
      postMessageSpy = sinon.spy(MockIACPort, 'postMessage');
      closeStub = sinon.stub(window, 'close');
    });

    teardown(function() {
      consoleErrorSpy.restore();
      postMessageSpy.restore();
      closeStub.restore();
    });

    test('invalid sync request', function() {
      window.dispatchEvent(new CustomEvent(IAC_EVENT));
      expect(consoleErrorSpy.called).to.equal(true);
      expect(consoleErrorSpy.args[0][0]).to.equal('Wrong IAC request');
      expect(postMessageSpy.called).to.equal(false);
      expect(closeStub.called).to.equal(true);
    });

    test('Unknown IAC request', function() {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          name: 'whatever',
          id: id
        }
      }));
      expect(consoleErrorSpy.called).to.equal(true);
      expect(consoleErrorSpy.args[0][0]).to.equal('Unknown IAC request');
      expect(postMessageSpy.called).to.equal(false);
      expect(closeStub.called).to.equal(true);
    });

    test('successful sync request', function(done) {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          name: 'sync',
          id: id,
          URL: 'url',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: { collection: {} }
        }
      }));
      setTimeout(function() {
        expect(consoleErrorSpy.called).to.equal(false);
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0]).to.deep.equal({
          id: id
        });
        expect(postMessageSpy.args[0][0].error).to.equal(undefined);
        expect(closeStub.called).to.equal(true);
        done();
      });
    });

    test('failed sync request', function(done) {
      var id = Date.now();
      MockSyncEngine.shouldFail = true;
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          name: 'sync',
          id: id,
          URL: 'url',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: { collection: {} }
        }
      }));
      setTimeout(function() {
        expect(consoleErrorSpy.called).to.equal(false);
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error.message)
          .to.equal('mock sync failure');
        expect(closeStub.called).to.equal(true);
        done();
      });
    });

    test('Cancel sync request', function() {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          name: 'cancel',
          id: id
        }
      }));
      expect(closeStub.called).to.equal(true);
      expect(postMessageSpy.called).to.equal(false);
    });
  });
});
