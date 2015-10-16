/* global MocksHelper, MockNavigatorDatastore, BaseModule */
/* global BookmarksDatabase, Service */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/bookmarks_database.js');

requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/pins_manager.js');

var mocksForPinsManager = new MocksHelper([
  'Datastore',
  'LazyLoader'
]).init();

suite('Pins Manager', function() {

  var realDatastores, subject, mockBookmarks, expectedScopes;
  var scopeChangeSpy;

  mocksForPinsManager.attachTestHelpers();

  suiteSetup(function(done) {
    realDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    scopeChangeSpy = sinon.spy();
    window.addEventListener('pins-scopechange', scopeChangeSpy);

    subject = BaseModule.instantiate('PinsManager');
    subject.start().then(done);
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastores;
    window.removeEventListener('pins-scopechange', scopeChangeSpy);
  });

  setup(function() {
    mockBookmarks = {
      'http://test.com/id': {
        id: 'http://test.com/id',
        pinned: true,
        scope: 'http://test.com'
      },
      'http://test.com/bla/url2': {
        id: 'http://test.com/bla/url2',
        pinned: true,
        scope: 'http://test.com/bla'
      },
      'http://blabla.com/id': {
        id: 'http://blabla.com/id',
        pinned: true,
        scope: 'http://blabla.com'
      }
    };

    expectedScopes = {
      'http://test.com': {
        'http://test.com': 'http://test.com/id',
        'http://test.com/bla': 'http://test.com/bla/url2'
      },
      'http://blabla.com': {
        'http://blabla.com': 'http://blabla.com/id'
      }
    };
  });

  teardown(function() {
    scopeChangeSpy.reset();
  });

  suite('Initialization', function() {
    setup(function() {
      this.sinon.stub(BookmarksDatabase, 'addEventListener');
      this.sinon.stub(BookmarksDatabase, 'getAll').returns({
        then: function(callback) {
          callback(mockBookmarks);
        }
      });
      subject._start();
    });

    test('Initializes the scope object', function() {
      assert.isTrue(BookmarksDatabase.getAll.called);
      assert.deepEqual(subject._scopes, expectedScopes);
    });

    test('Adds listeners to Bookmarks', function() {
      assert.isTrue(BookmarksDatabase.getAll.called);
      console.log(subject._scopes, expectedScopes);
      assert(BookmarksDatabase.addEventListener.calledWith('added'));
      assert(BookmarksDatabase.addEventListener.calledWith('removed'));
      assert(BookmarksDatabase.addEventListener.calledWith('updated'));
    });
  });

  suite('isPinned', function() {
    setup(function() {
      this.sinon.stub(BookmarksDatabase, 'getAll').returns({
        then: function(callback) {
          callback(mockBookmarks);
        }
      });
      subject._start();
    });

    test('Pinned site', function(done) {
      Service.request('PinsManager:isPinned', Object.keys(mockBookmarks)[0])
        .then(function(isPinned) {
          assert.isTrue(isPinned);
          done();
        });
    });

    test('Not pinned site', function(done) {
      Service.request('PinsManager:isPinned', 'http://mytesturl.com')
        .then(function(isPinned) {
          assert.isFalse(isPinned);
          done();
        });
    });
  });

  suite('on Bookmarks change', function() {
    setup(function() {
      this.sinon.stub(BookmarksDatabase, 'getAll').returns({
        then: function(callback) {
          callback(mockBookmarks);
        }
      });
      subject._start();
    });

    test('Removing a bookmark', function(done) {
      var url = 'http://blabla.com/id';
      subject._onChange({
        type: 'removed',
        target: {
          id: url
        }
      });

      Service.request('PinsManager:isPinned', url)
        .then(function(isPinned) {
          assert.isFalse(isPinned);
          done();
        });
    });

    test('Removing a scope', function(done) {
      scopeChangeSpy.reset();
      var urlScope1 = 'http://test.com/bla/url2';
      var urlScope2 = 'http://test.com/id';
      subject._onChange({
        type: 'removed',
        target: {
          id: urlScope1
        }
      });

      assert.isTrue(scopeChangeSpy.calledOnce);
      var actualEvent = scopeChangeSpy.getCall(0).args[0];
      assert.equal(actualEvent.detail.scope, 'http://test.com/bla');

      Service.request('PinsManager:isPinned', urlScope1)
        .then(function(isPinned) {
          assert.isFalse(isPinned);
        });

      Service.request('PinsManager:isPinned', urlScope2)
        .then(function(isPinned) {
          assert.isTrue(isPinned);
          done();
        });
    });

    test('Adding a bookmark', function(done) {
      var url = 'http://querty.com';
      Service.request('PinsManager:isPinned', url)
        .then(function(isPinned) {
          assert.isFalse(isPinned);
          scopeChangeSpy.reset();
          subject._onChange({
            type: 'added',
            target: {
              id: url,
              pinned: true,
              scope: url
            }
          });
          assert.isTrue(scopeChangeSpy.calledOnce);
          var actualEvent = scopeChangeSpy.getCall(0).args[0];
          assert.equal(actualEvent.detail.scope, url);

          Service.request('PinsManager:isPinned', url)
            .then(function(isPinned) {
              assert.isTrue(isPinned);
              done();
            });
        });
    });
  });

});
