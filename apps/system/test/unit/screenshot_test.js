/* global MocksHelper,
   MockL10n,
   MockMozActivity,
   MockNavigatorGetDeviceStorage,
   MockNotification,
   MockService,
   Screenshot
*/

'use strict';

requireApp('system/shared/test/unit/mocks/mock_event_target.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_navigator_get_device_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_notification.js');

var mocksForScreenshot = new MocksHelper([
  'Service'
]).init();

suite('system/Screenshot', function() {
  var screenshot;

  //var realDispatchEvent = window.dispatchEvent;
  var CustomEvent = window.CustomEvent;

  var realL10n;
  var realMozActivity;
  var realNavigatorGetDeviceStorage;
  var realNotification;

  var fireCustomEvent = function(type, prop) {
    var evt = new CustomEvent(type, prop);

    /**
     * XXX: Instead of dispatch the event through real dispatchEvent here
     * (bypass stub), we call handleEvent() directly to avoid possible conflict
     * within our dirty unit test environment. See bug 864178 for detail.
     */
    //realDispatchEvent.call(window, evt);
    screenshot.handleEvent(evt);
  };

  var timestamp = new Date().getTime();
  var notification = {
    body: 'fake',
    tag: 'screenshot:' + timestamp,
    data: {
      systemMessageTarget: 'screenshot'
    },
    close: function() {}
  };

  mocksForScreenshot.attachTestHelpers();

  setup(function(done) {
    // XXX: deinitialize "global" instance in screenshot.js
    if (window.screenshot) {
      window.screenshot.stop();
      window.screenshot = null;
    }

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realNotification = window.Notification;
    window.Notification = MockNotification;

    window.CustomEvent = function MockCustomEvent(type, prop) {
      this.type = type;
      this.detail = prop.detail;
    };

    require('/js/screenshot.js', function() {
      screenshot = new Screenshot();
      screenshot.start();
      done();
    });
  });

  teardown(function() {
    screenshot.stop();

    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
    navigator.mozL10n = realL10n;
    window.Notification = realNotification;
    window.MozActivity = realMozActivity;

    window.CustomEvent = CustomEvent;
  });

  test('Receive volumedown+sleep event with available device storage.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      fireCustomEvent('volumedown+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('available');

      assert.isTrue(freeSpaceSpy.calledOnce);
      var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
      freeSpaceRequest.fireSuccess(Number.MAX_VALUE);

      assert.isTrue(stubDispatchEvent.calledOnce);
      assert.isTrue(stubDispatchEvent.calledWith(
        { type: 'mozContentEvent', detail: { type: 'take-screenshot' }}));
    });

  test('Receive volumedown+sleep event with unavailable device storage.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      fireCustomEvent('volumedown+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('unavailable');

      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'screenshotFailed');

      var options = notificationSpy.firstCall.args[1];
      assert.equal(options.body, 'screenshotNoSDCard');
      assert.equal(options.icon, '/style/icons/Gallery.png');

      var tagSplit = options.tag.split(':');
      assert.equal(tagSplit[0], 'screenshot');
      assert.equal(tagSplit[1].length, 13);

      assert.equal(options.data.systemMessageTarget, 'screenshot');
    });

  test('Receive volumedown+sleep event with shared device storage.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      fireCustomEvent('volumedown+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('shared');

      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'screenshotFailed');

      var options = notificationSpy.firstCall.args[1];
      assert.equal(options.body, 'screenshotSDCardInUse');
      assert.equal(options.icon, '/style/icons/Gallery.png');

      var tagSplit = options.tag.split(':');
      assert.equal(tagSplit[0], 'screenshot');
      assert.equal(tagSplit[1].length, 13);

      assert.equal(options.data.systemMessageTarget, 'screenshot');
    });

  test('Receive volumedown+sleep event with low disk space.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      fireCustomEvent('volumedown+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('available');

      assert.isTrue(freeSpaceSpy.calledOnce);
      var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
      freeSpaceRequest.fireSuccess(256);

      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'screenshotFailed');

      var options = notificationSpy.firstCall.args[1];
      assert.equal(options.body, 'screenshotSDCardLow');
      assert.equal(options.icon, '/style/icons/Gallery.png');

      var tagSplit = options.tag.split(':');
      assert.equal(tagSplit[0], 'screenshot');
      assert.equal(tagSplit[1].length, 13);

      assert.equal(options.data.systemMessageTarget, 'screenshot');
    });

  test('Receive take-screenshot-success mozChromeEvent event',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = Number.MAX_VALUE;

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var addNamedSpy = this.sinon.spy(mockDeviceStorage, 'addNamed');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      var mockFile = {};
      fireCustomEvent('mozChromeEvent',
        { detail: { type: 'take-screenshot-success', file: mockFile } });

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('available');

      assert.isTrue(freeSpaceSpy.calledOnce);
      var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
      freeSpaceRequest.fireSuccess(Number.MAX_VALUE);

      assert.isTrue(addNamedSpy.calledOnce);
      assert.isTrue(addNamedSpy.firstCall.args[0] === mockFile);
      var addNamedRequest = addNamedSpy.getCall(0).returnValue;
      addNamedRequest.fireSuccess(Number.MAX_VALUE);

      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'screenshotSaved');

      var options = notificationSpy.firstCall.args[1];
      assert.equal(options.icon, '/style/icons/Gallery.png');

      var tagSplit = options.tag.split(':');
      assert.equal(tagSplit[0], 'screenshot');
      assert.equal(tagSplit[1].length, 13);

      assert.equal(options.data.systemMessageTarget, 'screenshot');
    });

  test('openImage triggers MozActivity', function() {
    var filename = 'fake.jpg';
    var mockBlob = { type: 'image/jpeg' };
    var expectedActivity = {
      name: 'open',
      data: {
        type: mockBlob.type,
        filename: filename,
        blob: mockBlob,
        exitWhenHidden: true
      }
    };

    var mockDeviceStorage = MockNavigatorGetDeviceStorage();
    mockDeviceStorage._freeSpace = Number.MAX_VALUE;

    var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
    var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
    var getSpy = this.sinon.spy(mockDeviceStorage, 'get');

    var activitySpy = this.sinon.spy(window, 'MozActivity');

    screenshot.openImage(filename);

    // Simulate success of reading file
    var availableRequest = availableSpy.getCall(0).returnValue;
    availableRequest.fireSuccess('available');
    var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
    freeSpaceRequest.fireSuccess(Number.MAX_VALUE);
    var getRequest = getSpy.getCall(0).returnValue;
    getRequest.fireSuccess(mockBlob);
    assert.isTrue(activitySpy.calledWith(expectedActivity));
  });

  suite('Handlers installation', function() {
    var eventSpy;

    setup(function() {
      screenshot.stop();
    });

    teardown(function() {
      screenshot.start();
    });

    test('.start() installs event listeners', function() {
      eventSpy = this.sinon.spy(window, 'addEventListener');
      screenshot.start();
      assert.isTrue(eventSpy.calledTwice);
      screenshot.stop();
      assert.equal(eventSpy.getCall(0).args[0], 'volumedown+sleep');
      assert.equal(eventSpy.getCall(1).args[0], 'mozChromeEvent');
    });

    test('.stop() removes event listeners', function() {
      screenshot.start();
      eventSpy = this.sinon.spy(window, 'removeEventListener');
      screenshot.stop();
      assert.isTrue(eventSpy.calledTwice);
      assert.equal(eventSpy.getCall(0).args[0], 'volumedown+sleep');
      assert.equal(eventSpy.getCall(1).args[0], 'mozChromeEvent');
    });
  });

  suite('System message notification', function() {
    var serviceSpy;

    suite('start/stop conditions', function() {
      setup(function() {
        screenshot.stop();
      });

      teardown(function() {
        screenshot.start();
      });

      test('.start() requests handleSystemMessageNotification service',
        function() {
          serviceSpy = this.sinon.spy(MockService, 'request');
          screenshot.start();
          assert.isTrue(serviceSpy.calledOnce);
          assert.isTrue(serviceSpy.calledWith(
            'handleSystemMessageNotification', 'screenshot', screenshot));
          screenshot.stop();
        });

      test('.stop() requests unhandleSystemMessageNotification service',
        function() {
          screenshot.start();
          serviceSpy = this.sinon.spy(MockService, 'request');
          screenshot.stop();
          assert.isTrue(serviceSpy.calledOnce);
          assert.isTrue(serviceSpy.calledWith(
            'unhandleSystemMessageNotification', 'screenshot', screenshot));
        });
    });

    suite('handleSystemMessageNotification behavior', function() {
      test('calls openImage', function() {
        var openImageSpy = this.sinon.spy(screenshot, 'openImage');
        screenshot.handleSystemMessageNotification(notification);
        assert.isTrue(openImageSpy.calledOnce);
        assert.isTrue(openImageSpy.calledWith(notification.body));
      });

      test('calls closeSystemMessageNotification',
        function() {
          var closeSpy =
            this.sinon.spy(screenshot, 'closeSystemMessageNotification');
          screenshot.handleSystemMessageNotification(notification);
          assert.isTrue(closeSpy.calledOnce);
          assert.isTrue(closeSpy.calledWith(notification));
        });
    });

    suite('closeSystemMessageNotification behavior', function() {
      var notifCloseSpy, notificationGetStub;

      setup(function() {
        notifCloseSpy = this.sinon.spy(notification, 'close');
        notificationGetStub = function notificationGet() {
          return {
            then: function(cb) {
              cb && cb([ notification ]);
            }
          };
        };
        this.sinon.stub(window.Notification, 'get', notificationGetStub);
      });

      test('closes notification by tag', function() {
        screenshot.closeSystemMessageNotification(notification);
        assert.isTrue(window.Notification.get.calledOnce);
        assert.isTrue(window.Notification.get.calledWith(
          { tag: notification.tag}));
        assert.isTrue(notifCloseSpy.calledOnce);
      });

      test('closes notification by body', function() {
        var tag = notification.tag;
        notification.tag = undefined;

        screenshot.closeSystemMessageNotification(notification);
        assert.isTrue(window.Notification.get.calledOnce);
        assert.isTrue(window.Notification.get.calledWith(
          { tag: notification.tag}));
        assert.isTrue(notifCloseSpy.calledOnce);

        notification.tag = tag;
      });
    });
  });
});
