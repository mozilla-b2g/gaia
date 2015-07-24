'use strict';

/* global MockNavigatormozSetMessageHandler, CollectionsDatabase, setup,
          MockXMLHttpRequest */

require('/shared/js/collections_database.js');
requireApp('collection/test/unit/mock_xmlhttprequest.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/lazy_loader.js');

var mocksHelperForInitialized = new MocksHelper([
  'XMLHttpRequest'
]).init();

suite('setup.js >', function() {

  var realSetMessageHandler = null,
      eventName = 'connection',
      cdAddStub = null,
      collections = [],
      port = {
        start: function() {
          this.cb();
        },
        set onmessage(cb) {
          this.cb = cb;
        }
      };

  mocksHelperForInitialized.attachTestHelpers();
 
  suiteSetup(function(done) {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();
    requireApp('collection/js/setup.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  setup(function() {
    cdAddStub = sinon.stub(CollectionsDatabase, 'add', function(collection) {
      collections.push(collection);

      return {
        then: function(resolve) {
          resolve();
        }
      };
    });
  });

  teardown(function() {
    delete port.postMessage;
    cdAddStub.restore();
    collections = [];
  });

  function initialize() {
    MockNavigatormozSetMessageHandler.mTrigger(eventName, {
      keyword: 'setup',
      port: port
    });
  }

  function sendResponseText(text) {
    MockXMLHttpRequest.mSendOnLoad({
      responseText: text
    });
  }

  test('The library was initialized correctly ', function() {
    assert.isUndefined(setup.initializing);
  });

  test('Window is closed ', function(done) {
    sinon.stub(window, 'close', function() {
      window.close.restore();
      done();
    });

    port.postMessage = function() {};

    initialize();
    sendResponseText('{ "collections" : [] }');
  });

  test('There are no collections ', function(done) {
    port.postMessage = function(msg) {
      assert.isFalse(cdAddStub.called);
      assert.equal(msg, 'Done');
      done();
    };

    initialize();
    sendResponseText('{ "collections" : [] }');
  });

  test('There one collection ', function(done) {
    port.postMessage = function(msg) {
      assert.isTrue(cdAddStub.called);
      assert.equal(collections.length, 1);
      assert.equal(msg, 'Done');
      done();
    };

    initialize();
    sendResponseText('{ "collections" : [ {' +
      '"name": "Tv",' +
      '"categoryId": "213",' +
      '"pinned": [' +
      '  ["app://video.gaiamobile.org/manifest.webapp"]' +
      '],' +
      '"icon": "/collections/tv/icon_90.png",' +
      '"background": "/collections/tv/background_480x800.jpg"' +
    '}]}');
  });

  test('There are two collections ', function(done) {
    port.postMessage = function(msg) {
      assert.isTrue(cdAddStub.called);
      assert.equal(collections.length, 2);
      assert.equal(msg, 'Done');
      done();
    };

    initialize();
    sendResponseText('{ "collections" : [ {' +
      '"name": "Tv",' +
      '"categoryId": "213",' +
      '"pinned": [' +
      '  ["app://video.gaiamobile.org/manifest.webapp"]' +
      '],' +
      '"icon": "/collections/tv/icon_90.png",' +
      '"background": "/collections/tv/background_480x800.jpg"' +
    '},{' +
      '"name": "Social",' +
      '"categoryId": "289",' +
      '"pinned": [' +
      '  ["app://email.gaiamobile.org/manifest.webapp"]' +
      '],' +
      '"icon": "/collections/social/icon_90.png",' +
      '"background": "/collections/social/background_480x800.jpg"' +
    '}]}');
  });

  test('File not found ', function(done) {
    port.postMessage = function(msg) {
      assert.isFalse(cdAddStub.called);
      assert.equal(msg, 'Failed');
      done();
    };

    initialize();
    MockXMLHttpRequest.mSendError();
  });

  test('Unknown response ', function(done) {
    port.postMessage = function(msg) {
      assert.isFalse(cdAddStub.called);
      assert.equal(msg, 'Failed');
      done();
    };

    initialize();
    MockXMLHttpRequest.status = 400;
    sendResponseText('{ "collections" : [] }');
  });

  test('JSON not well-formed ', function(done) {
    port.postMessage = function(msg) {
      assert.isFalse(cdAddStub.called);
      assert.equal(msg, 'Failed');
      done();
    };

    initialize();
    sendResponseText('hi my friends!');
  });

});
