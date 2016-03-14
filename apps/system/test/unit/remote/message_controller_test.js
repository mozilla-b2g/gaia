/* global MocksHelper, BaseModule, BroadcastChannel, Service */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/remote/message_controller.js');

var mocksForMultiScreenHelper = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/remote/MessageController', function() {
  mocksForMultiScreenHelper.attachTestHelpers();

  var subject;
  var fakeDisplayId = 'test';

  setup(function() {
    this.sinon.stub(Service, 'query', function(state) {
      if (state == 'displayId') {
        return fakeDisplayId;
      }
    });

    subject = BaseModule.instantiate('MessageController');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('start', function() {
    test('should cache the displayId', function() {
      assert.equal(subject.displayId, fakeDisplayId);
    });

    test('should establish a broadcast channel', function() {
      assert.isNotNull(subject.broadcastChannel);
      assert.equal(subject.broadcastChannel.name, 'multiscreen');
    });
  });

  suite('post messages', function() {
    test('should post the message well-formedly', function(done) {
      var fakeType = 'type';
      var fakeDetail = {
        data1: '1',
        data2: 2
      };
      this.sinon.stub(subject.broadcastChannel, 'postMessage', function(data) {
        done(function() {
          assert.equal(data.source, subject.displayId);
          assert.equal(data.type, fakeType);
          assert.equal(data.detail, fakeDetail);
          assert.isUndefined(data.target);
        });
      });
      subject.postMessage(fakeType, fakeDetail);
    });
  });

  suite('receive messages', function() {
    var broadcastChannel;
    var fakeConfig = {
      url: 'test.html'
    };

    function broadcastMessage(target, type, detail) {
      broadcastChannel.postMessage({
        target: target,
        type: type,
        detail: detail
      });
    }

    setup(function() {
      broadcastChannel = new BroadcastChannel('multiscreen');
    });

    teardown(function() {
      broadcastChannel.close();
    });

    test('should call "launchPresentationApp" when receiving ' +
                                          '"app-config-ready"', function(done) {
      this.sinon.stub(Service, 'request', function(service, config) {
        done(function() {
          assert.equal(service, 'launchPresentationApp');
          assert.equal(config.url, fakeConfig.url);
        });
      });

      broadcastMessage(subject.displayId, 'app-config-ready', fakeConfig);
    });

    test('should ignore message if data.target isn\'t current displayId',
                                                                function(done) {
      this.sinon.stub(Service, 'request');
      this.sinon.stub(subject, '_post_handleEvent', function() {
        done(function() {
          assert.isFalse(Service.request.called);
        });
      });

      broadcastMessage('unknow-target', 'app-config-ready', fakeConfig);
    });
  });
});
