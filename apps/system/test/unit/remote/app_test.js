/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global MocksHelper, BaseModule, BroadcastChannel, Service */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/remote/app.js');

var mocksForMultiScreenHelper = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/remote/App', function() {
  mocksForMultiScreenHelper.attachTestHelpers();
  var fakeAppConfig = {
    'isActivity': false,
    'url': 'app://test-presentation-app/index.html',
    'name': 'Fake Presentation App',
    'manifestURL': 'app://test-presentation-app/manifest.webapp',
    'origin': 'app://test-presentation-app',
    'manifest': {},
    target: {}
  };

  var subject;

  setup(function() {
    window.location.hash = '#test';
    subject = BaseModule.instantiate('App');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('displayId', function() {
    test('should get the displayId from location.hash', function() {
      assert.equal(subject._displayId, 'test');
    });

    test('should return displayId', function() {
      assert.equal(subject.displayId(), subject._displayId);
    });
  });

  suite('receive messages', function() {
    var broadcastChannel;
    var fakeRequestId = 'test-request-id';
    var fakeTimestamp = 'test-timestamp';

    setup(function() {
      broadcastChannel = new BroadcastChannel('multiscreen');
    });

    teardown(function() {
      broadcastChannel.close();
    });

    test('should post "requst-app-config" message when receiving' +
                              '"presentation-launch-receiver"', function(done) {
      this.sinon.stub(Service, 'request', function(method, type, detail) {
        done(function() {
          assert.equal(method, 'postMessage');
          assert.equal(type, 'request-app-config');
          assert.equal(detail.url, fakeAppConfig.url);
          assert.equal(detail.manifestURL, fakeAppConfig.manifestURL);
          assert.equal(detail.timestamp, fakeTimestamp);
          assert.equal(detail.requestId, fakeRequestId);
        });
      });

      window.dispatchEvent(new CustomEvent('mozPresentationChromeEvent', {
        detail: {
          type:      'presentation-launch-receiver',
          url:       fakeAppConfig.url,
          timestamp: fakeTimestamp,
          id:        fakeRequestId
        }
      }));
    });
  });
});
