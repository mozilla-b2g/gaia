/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global MocksHelper, ActionMenu, BaseModule, BroadcastChannel */
/* global MockApplications */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_action_menu.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/browser_config_helper.js');
requireApp('system/js/multi_screen_controller.js');

var mocksForMultiScreenController = new MocksHelper([
  'ActionMenu',
  'LazyLoader',
  'ManifestHelper'
]).init();

suite('system/MultiScreenController', function() {
  mocksForMultiScreenController.attachTestHelpers();
  var subject;
  var realApplications;

  var mockConfig = {
    url: 'test'
  };

	var mockPresentationDevices = [{
      id:   'test-id',
      name: 'test-name',
      type: 'test-type'
    }];

  var mockDeviceListForActionMenu =
    mockPresentationDevices.map((device, idx) => {
      return {
        name: device.name,
        deviceId: device.id,
        id: idx,
      };
    });

  function triggerMozChromeEvent(detail) {
    window.dispatchEvent(new CustomEvent('mozChromeEvent', {
      detail: detail
    }));
  }

  setup(function() {
    realApplications = window.applications;
    window.applications = MockApplications;
    subject = BaseModule.instantiate('MultiScreenController');
    subject.start();
  });

  teardown(function() {
    window.applications = realApplications;
    subject.stop();
  });

  suite('start', function() {
    test('should establish a broadcast channel', function() {
      assert.isNotNull(subject.broadcastChannel);
      assert.equal(subject.broadcastChannel.name, 'multiscreen');
    });

  });

  suite('request config should be stored correctly', function() {
    var fakeUrl = 'app://test-url/';
    var fakeManifestURL = 'app://test-url/manifest.webapp';
    var fakeApp = {
      origin: fakeUrl,
      manifestURL: fakeManifestURL,
      manifest: {}
    };

    setup(function() {
      MockApplications.mRegisterMockApp(fakeApp);
    });

    teardown(function() {
      MockApplications.mUnregisterMockApp(fakeApp);
    });

    test('_handle_mozPresentationChromeEvent', function() {
      var handleMozPresentationChromeEventSpy =
        this.sinon.spy(subject, '_handle_mozPresentationChromeEvent');

      window.dispatchEvent(new CustomEvent('mozPresentationChromeEvent', {
        detail: {
          type: 'presentation-launch-receiver',
          url: fakeUrl,
          timestamp: 'test-timestamp',
          id: 'test-request-id'
        }
      }));

      assert.ok(handleMozPresentationChromeEventSpy.calledOnce);
      assert.equal(subject.requestConfig.url, fakeUrl);
      assert.equal(subject.requestConfig.manifestURL, fakeManifestURL);
      assert.equal(subject.requestConfig.timestamp, 'test-timestamp');
      assert.equal(subject.requestConfig.requestId, 'test-request-id');

      handleMozPresentationChromeEventSpy.restore();
    });
  });

  suite('showMenu', function() {
    test('should show the action menu', function(done) {
      this.sinon.stub(ActionMenu.prototype, 'show', function(items, titleId) {
        done(function() {
          assert.equal(titleId, 'multiscreen-pick');
          for(var i in items) {
            assert.equal(items[i].label, mockDeviceListForActionMenu[i].name);
            assert.equal(items[i].value, mockDeviceListForActionMenu[i].id);
          }
        });
      });
      subject.showMenu(mockDeviceListForActionMenu);
    });

    test('should resolve with ID if user choose a device', function(done) {
      subject.showMenu(mockDeviceListForActionMenu).then(function(choice) {
        done(function() {
          assert.equal(choice, 1);
        });
      });
      subject.actionMenu.onselected(1);
    });

    test('should resolve without ID if user cancels', function(done) {
      subject.showMenu(mockDeviceListForActionMenu).then(function(choice) {
        done(function() {
          assert.isUndefined(choice);
        });
      });
      subject.actionMenu.oncancel();
    });

    test('should resolve immediately if no available device', function(done) {
      this.sinon.stub(ActionMenu.prototype, 'show');
      subject.showMenu([]).then(function(choice) {
        done(function() {
          assert.isUndefined(choice);
          assert.isTrue(ActionMenu.prototype.show.notCalled);
        });
      });
    });

    test('should reject if there\'s already an action menu', function(done) {
      subject.showMenu(mockDeviceListForActionMenu);
      subject.showMenu(mockDeviceListForActionMenu).catch(function() {
        done();
      });
    });
  });

  suite('postMessage', function() {
    test('should post the message well-formedly', function(done) {
      var fakeDisplayId = 123;
      var fakeType = 'type';
      var fakeDetail = {
        data1: '1',
        data2: 2
      };
      this.sinon.stub(subject.broadcastChannel, 'postMessage', function(data) {
        done(function() {
          assert.equal(data.target, fakeDisplayId);
          assert.equal(data.type, fakeType);
          assert.equal(data.detail, fakeDetail);
          assert.isUndefined(data.source);
        });
      });
      subject.postMessage(fakeDisplayId, fakeType, fakeDetail);
    });
  });

  suite('receive messages', function() {
    var broadcastChannel;
    var fakeDisplayId = 'test-id';

    setup(function() {
      subject.requestDeviceId = fakeDisplayId;
      broadcastChannel = new BroadcastChannel('multiscreen');
    });

    teardown(function() {
      subject.requestDeviceId = undefined;
      broadcastChannel.close();
    });

    test('should invoke "_handle_message" when receiving broadcast messages',
                                                                function(done) {
      this.sinon.stub(subject, '_handle_message', function() {
        done();
      });
      broadcastChannel.postMessage({});
    });

    test('should publish event when receiving "launch-app-success"',
                                                                function(done) {
      this.sinon.stub(subject, 'publish', function(event, detail) {
        console.log(event);
        if (event == 'launch-app-success') {
          done(function() {
            assert.equal(detail.displayId, fakeDisplayId);
            assert.equal(detail.config.url, mockConfig.url);
          });
        }
      });
      broadcastChannel.postMessage({
        source: fakeDisplayId,
        type: 'launch-app-success',
        detail: {
          config: mockConfig
        }
      });
    });

    test('should publish event when receiving "launch-app-error"',
                                                                function(done) {
      this.sinon.stub(subject, 'publish', function(event, detail) {
        console.log(event);
        if (event == 'launch-app-error') {
          done(function() {
            assert.equal(detail.displayId, fakeDisplayId);
            assert.equal(detail.reason, 'reason');
          });
        }
      });
      broadcastChannel.postMessage({
        source: fakeDisplayId,
        type: 'launch-app-error',
        detail: {
          reason: 'reason'
        }
      });
    });

    test('should post message "launch-presentation-app when receiving ' +
                                       '"remote-system-ready"', function(done) {
      this.sinon.stub(subject, 'postMessage', function(target, type, detail) {
        done(function() {
          assert.equal(target, 'test-id');
          assert.equal(type, 'launch-presentation-app');
          assert.isUndefined(detail);
        });
      });
      broadcastChannel.postMessage({
        source: subject.requestDeviceId,
        type: 'remote-system-ready',
      });
    });
  });

  suite('presentation device selection when device available', function() {
    var eventValidator;

    function _content_event_handler(evt) {
      if (eventValidator) {
        eventValidator(evt);
      }
    }

    setup(function() {
      window.navigator.mozPresentationDeviceInfo = {
        getAll: () => Promise.resolve(mockPresentationDevices)
      };
      window.addEventListener('mozContentEvent', _content_event_handler);
    });

    teardown(function() {
      delete window.navigator.mozPresentationDeviceInfo;
      window.removeEventListener('mozContentEvent', _content_event_handler);
    });

    test('queryPresentationDevices', function(done) {
      subject.queryPresentationDevices().then(function(list) {
        done(function() {
          assert.equal(list.length, 1);
        });
      });
    });

    test('device selected', function(done) {
      eventValidator = function(evt) {
        if (evt.detail.type !== 'presentation-select-result') {
          return;
        }

        done(function() {
          assert.equal(subject.requestDeviceId, 'test-id');
          assert.equal(evt.detail.type, 'presentation-select-result');
          assert.equal(evt.detail.deviceId, 'test-id');
          assert.equal(evt.detail.id, 'test-selection-id');
        });
      };

      this.sinon.stub(subject, 'showMenu', function(displays) {
        assert.equal(displays.length, 1);
        assert.equal(displays[0].name, 'test-name');
        assert.equal(displays[0].deviceId, 'test-id');
        assert.equal(displays[0].id, 0);
        return Promise.resolve(0);
      });

      triggerMozChromeEvent({
        type: 'presentation-select-device',
        id: 'test-selection-id',
      });
    });

    test('selection canceled', function(done) {
      eventValidator = function(evt) {
        if (evt.detail.type !== 'presentation-select-deny') {
          return;
        }

        done(function() {
          assert.isUndefined(subject.requestDeviceId);
          assert.equal(evt.detail.type, 'presentation-select-deny');
          assert.equal(evt.detail.id, 'test-selection-id');
        });
      };

      this.sinon.stub(subject, 'showMenu', function() {
        return Promise.resolve(undefined);
      });

      triggerMozChromeEvent({
        type: 'presentation-select-device',
        id: 'test-selection-id',
      });
    });
  });

  suite('presentation device selection when no available device', function() {
    var eventValidator;

    function _content_event_handler(evt) {
      if (eventValidator) {
        eventValidator(evt);
      }
    }

    setup(function() {
      window.navigator.mozPresentationDeviceInfo = {
        getAll: () => Promise.resolve([])
      };
      window.addEventListener('mozContentEvent', _content_event_handler);
    });

    teardown(function() {
      delete window.navigator.mozPresentationDeviceInfo;
      window.removeEventListener('mozContentEvent', _content_event_handler);
    });

    test('queryPresentationDevices', function(done) {
      subject.queryPresentationDevices().then(function(list) {
        done(function() {
          assert.equal(list.length, 0);
        });
      });
    });

    test('canceled while no available device', function(done) {
      eventValidator = function(evt) {
        if (evt.detail.type !== 'presentation-select-deny') {
          return;
        }

        done(function() {
          assert.isUndefined(subject.requestDeviceId);
          assert.equal(evt.detail.type, 'presentation-select-deny');
          assert.equal(evt.detail.id, 'test-selection-id');
        });
      };

      triggerMozChromeEvent({
        type: 'presentation-select-device',
        id: 'test-selection-id',
      });
    });
  });
});
