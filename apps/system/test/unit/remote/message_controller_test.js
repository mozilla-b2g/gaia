/* global MocksHelper, BaseModule, BroadcastChannel, Service */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/remote/message_controller.js');

var mocksForMultiScreenController = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/remote/MessageController', function() {
  mocksForMultiScreenController.attachTestHelpers();

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
    var launchAppSuccess;
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
      this.sinon.stub(Service, 'request', function(service, config) {
        return (service == 'launchPresentationApp' && launchAppSuccess) ?
          Promise.resolve() : Promise.reject('test-reason');
      });
    });

    teardown(function() {
      broadcastChannel.close();
    });

    test('should post "launch-app-success" when resolving from ' +
				 '"launchPresentationApp"', function(done) {
      launchAppSuccess = true;
      this.sinon.stub(subject, 'postMessage', function(type, detail) {
        done(function() {
          assert.equal(type, 'launch-app-success');
          assert.equal(detail.config.url, fakeConfig.url);
        });
      });
      broadcastMessage(subject.displayId,
											 'launch-presentation-app',
											 fakeConfig);
    });

    test('should post "launch-app-success" when rejecting from ' +
				 '"launchPresentationApp"', function(done) {
      launchAppSuccess = false;
      this.sinon.stub(subject, 'postMessage', function(type, detail) {
        done(function() {
          assert.equal(type, 'launch-app-error');
          assert.equal(detail.config.url, fakeConfig.url);
          assert.equal(detail.reason, 'test-reason');
        });
      });
      broadcastMessage(subject.displayId,
											 'launch-presentation-app',
											 fakeConfig);
    });

    test('should ignore message if data.target isn\'t current displayId',
                                                                function(done) {
      this.sinon.stub(subject, '_post_handleEvent', function() {
        done(function() {
          assert.isFalse(Service.request.called);
        });
      });
      broadcastMessage('unknow-target', 'launch-presentation-app', fakeConfig);
    });
  });
});
