/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global AboutServiceWorkersProxy */

'use strict';

requireApp('system/js/about_service_workers_proxy.js');
requireApp('system/test/unit/mock_iac_handler.js');

var MockEventListener = {};
function MockAddEventListener(event, listener) {
  MockEventListener[event] = listener;
}

suite('system/AboutServiceWorkersProxy >', function() {
  var stubAddEventListener;

  setup(function() {
    stubAddEventListener = this.sinon.stub(window, 'addEventListener',
                                           MockAddEventListener);
    AboutServiceWorkersProxy.start();
  });

  teardown(function() {
    stubAddEventListener.restore();
  });

  suite('Initial state', function() {
    test('Integrity', function() {
      assert.isNotNull(AboutServiceWorkersProxy);
    });

    test('Test event listeners', function() {
      // We should be listening for IAC messages
      assert.ok(MockEventListener['iac-about-service-workers']);
      assert.ok(
        MockEventListener['iac-about-service-workers'] instanceof Function);
      // But not for chrome events yet.
      assert.isUndefined(MockEventListener.mozAboutServiceWorkersChromeEvent);
    });
  });

  suite('On known IAC message', function() {
    var dispatchEventStub;

    setup(function() {
      dispatchEventStub = this.sinon.stub(window, 'dispatchEvent');

      AboutServiceWorkersProxy.onPortMessage({
        'detail': {
          'name': 'init'
        }
      });
    });

    teardown(function() {
      dispatchEventStub.restore();
    });

    test('We should send a content request', function() {
      sinon.assert.calledOnce(dispatchEventStub);
    });

    test('We should be listening for chrome events', function() {
      assert.ok(MockEventListener.mozAboutServiceWorkersChromeEvent);
    });
  });

  suite('On unknown IAC message', function() {
    var dispatchEventStub;

    setup(function() {
      dispatchEventStub = this.sinon.stub(window, 'dispatchEvent');

      AboutServiceWorkersProxy.onPortMessage({
        'detail': {
          'name': 'whatever'
        }
      });
    });

    teardown(function() {
      dispatchEventStub.restore();
    });

    test('We should send a content request', function() {
      sinon.assert.notCalled(dispatchEventStub);
    });
  });

});
