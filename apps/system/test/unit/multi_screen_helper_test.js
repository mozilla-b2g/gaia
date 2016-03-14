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
requireApp('system/js/multi_screen_helper.js');

var mocksForMultiScreenHelper = new MocksHelper([
  'ActionMenu',
  'LazyLoader',
  'ManifestHelper'
]).init();

suite('system/MultiScreenHelper', function() {
  mocksForMultiScreenHelper.attachTestHelpers();
  var subject;
  var realApplications;

  var fakeAppConfig = {
    'isActivity': false,
    'url': 'app://test-presentation-app/index.html',
    'name': 'Fake Presentation App',
    'manifestURL': 'app://test-presentation-app/manifest.webapp',
    'origin': 'app://test-presentation-app',
    'manifest': {},
    target: {}
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
    window.applications.mRegisterMockApp(fakeAppConfig);
    subject = BaseModule.instantiate('MultiScreenHelper');
    subject.start();
  });

  teardown(function() {
    window.applications.mUnregisterMockApp(fakeAppConfig);
    window.applications = realApplications;
    subject.stop();
  });

  suite('start', function() {
    test('should establish a broadcast channel', function() {
      assert.isNotNull(subject.broadcastChannel);
      assert.equal(subject.broadcastChannel.name, 'multiscreen');
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
    var fakeDisplayId = 'test-display-id';
    var fakeRequestId = 'test-request-id';
    var fakeTimestamp = 'test-timestamp';

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

    test('should post "app-config-ready" message when receiving' +
                                      '"request-app-config"', function(done) {

      this.sinon.stub(subject, 'postMessage', function(target, type, detail) {
        done(function() {
          assert.equal(type, 'app-config-ready');
          assert.equal(target, fakeDisplayId);
          assert.equal(detail.url, fakeAppConfig.url);
          assert.equal(detail.manifestURL, fakeAppConfig.manifestURL);
          assert.equal(detail.timestamp, fakeTimestamp);
          assert.equal(detail.requestId, fakeRequestId);
        });
      });

      broadcastChannel.postMessage({
        source: subject.requestDeviceId,
        type: 'request-app-config',
        detail: {
          url: fakeAppConfig.url,
          manifestURL: fakeAppConfig.manifestURL,
          timestamp: fakeTimestamp,
          requestId: fakeRequestId
        }
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
