'use strict';
/* global MockNavigatorGetDeviceStorage, MockL10n, MockNotification,
          Screenshot */

requireApp('system/js/screenshot.js');
requireApp('system/shared/test/unit/mocks/mock_event_target.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
requireApp('system/test/unit/mock_navigator_get_device_storage.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_notification.js');


suite('system/Screenshot', function() {
  var screenshot;

  //var realDispatchEvent = window.dispatchEvent;
  var CustomEvent = window.CustomEvent;

  var realNavigatorGetDeviceStorage;
  var realL10n;
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

  setup(function() {
    // XXX: deinitialize "global" instance in screenshot.js
    if (window.screenshot) {
      window.screenshot.stop();
      window.screenshot = null;
    }

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realNotification = window.Notification;
    window.Notification = MockNotification;

    screenshot = new Screenshot();
    screenshot.start();

    window.CustomEvent = function MockCustomEvent(type, prop) {
      this.type = type;
      this.detail = prop.detail;
    };
  });

  teardown(function() {
    screenshot.stop();

    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
    navigator.mozL10n = realL10n;
    window.Notification = realNotification;

    window.CustomEvent = CustomEvent;
  });

  test('Receive home+sleep event with available device storage.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      fireCustomEvent('home+sleep');

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

  test('Receive home+sleep event with unavailable device storage.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      fireCustomEvent('home+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('unavailable');

      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'screenshotFailed');
      assert.deepEqual(notificationSpy.firstCall.args[1],
        { body: 'screenshotNoSDCard',
          icon: 'style/icons/Gallery.png'});
    });

  test('Receive home+sleep event with shared device storage.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      fireCustomEvent('home+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      var availableRequest = availableSpy.getCall(0).returnValue;
      availableRequest.fireSuccess('shared');

      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'screenshotFailed');
      assert.deepEqual(notificationSpy.firstCall.args[1],
        { body: 'screenshotSDCardInUse',
          icon: 'style/icons/Gallery.png'});
    });

  test('Receive home+sleep event with low disk space.',
    function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var notificationSpy = this.sinon.spy(window, 'Notification');

      fireCustomEvent('home+sleep');

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
      assert.deepEqual(notificationSpy.firstCall.args[1],
        { body: 'screenshotSDCardLow',
          icon: 'style/icons/Gallery.png'});
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
      assert.equal(notificationSpy.firstCall.args[1].icon,
        'style/icons/Gallery.png');
    });
});
