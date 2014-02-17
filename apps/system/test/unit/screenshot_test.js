'use strict';
/* global MockNavigatorGetDeviceStorage, MockL10n, Screenshot */

requireApp('system/js/screenshot.js');
requireApp('system/test/unit/mock_navigator_get_device_storage.js');
requireApp('system/test/unit/mock_l10n.js');

mocha.globals(['Screenshot']);


suite('system/Screenshot', function() {
  var screenshot;

  //var realDispatchEvent = window.dispatchEvent;
  var CustomEvent = window.CustomEvent;

  var realNavigatorGetDeviceStorage;
  var realL10n;

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

    var mockDeviceStorage = MockNavigatorGetDeviceStorage();
    mockDeviceStorage._freeSpace = 0;
    mockDeviceStorage._availableState = 'available';

    window.CustomEvent = CustomEvent;
  });

  test('Receive home+sleep event with available device storage.',
    function(done) {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = Number.MAX_VALUE;

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      fireCustomEvent('home+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      setTimeout(function(){

        assert.isTrue(freeSpaceSpy.calledOnce);
        setTimeout(function(){
          assert.isTrue(stubDispatchEvent.calledOnce);
          assert.isTrue(stubDispatchEvent.calledWith(
            { type: 'mozContentEvent', detail: { type: 'take-screenshot' }}));

          done();
        });
      });
    });

  test('Receive home+sleep event with unavailable device storage.',
    function(done) {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = Number.MAX_VALUE;
      mockDeviceStorage._availableState = 'unavailable';

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var createNotificationStub =
        this.sinon.stub(navigator.mozNotification, 'createNotification');
      var notificationShowStub = this.sinon.stub();
      createNotificationStub.returns({
        show: notificationShowStub
      });

      fireCustomEvent('home+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      setTimeout(function(){
        assert.isTrue(createNotificationStub.calledOnce);
        assert.isTrue(
          createNotificationStub.getCall(0).calledWith(
            'screenshotFailed', 'screenshotNoSDCard',
            'style/icons/Gallery.png'));
        assert.isTrue(notificationShowStub.calledOnce);

        done();
      });
    });

  test('Receive home+sleep event with shared device storage.',
    function(done) {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = Number.MAX_VALUE;
      mockDeviceStorage._availableState = 'shared';

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var createNotificationStub =
        this.sinon.stub(navigator.mozNotification, 'createNotification');
      var notificationShowStub = this.sinon.stub();
      createNotificationStub.returns({
        show: notificationShowStub
      });

      fireCustomEvent('home+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      setTimeout(function(){
        assert.isTrue(createNotificationStub.calledOnce);
        assert.isTrue(
          createNotificationStub.getCall(0).calledWith(
            'screenshotFailed', 'screenshotSDCardInUse',
            'style/icons/Gallery.png'));
        assert.isTrue(notificationShowStub.calledOnce);

        done();
      });
    });

  test('Receive home+sleep event with low disk space.',
    function(done) {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = 256;

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var createNotificationStub =
        this.sinon.stub(navigator.mozNotification, 'createNotification');
      var notificationShowStub = this.sinon.stub();
      createNotificationStub.returns({
        show: notificationShowStub
      });

      fireCustomEvent('home+sleep');

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      setTimeout(function(){

        assert.isTrue(freeSpaceSpy.calledOnce);
        setTimeout(function(){
          assert.isTrue(createNotificationStub.calledOnce);
          assert.isTrue(
            createNotificationStub.getCall(0).calledWith(
              'screenshotFailed', 'screenshotSDCardLow',
              'style/icons/Gallery.png'));
          assert.isTrue(notificationShowStub.calledOnce);

          done();
        });
      });
    });

  test('Receive take-screenshot-success mozChromeEvent event',
    function(done) {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = Number.MAX_VALUE;

      var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var availableSpy = this.sinon.spy(mockDeviceStorage, 'available');
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      var addNamedSpy = this.sinon.spy(mockDeviceStorage, 'addNamed');
      var createNotificationStub =
        this.sinon.stub(navigator.mozNotification, 'createNotification');
      var notificationShowStub = this.sinon.stub();
      createNotificationStub.returns({
        show: notificationShowStub
      });

      var mockFile = {};
      fireCustomEvent('mozChromeEvent',
        { detail: { type: 'take-screenshot-success', file: mockFile } });

      assert.isTrue(deviceStorageSpy.calledOnce);

      assert.isTrue(availableSpy.calledOnce);
      setTimeout(function(){

        assert.isTrue(freeSpaceSpy.calledOnce);
        setTimeout(function(){

          assert.isTrue(addNamedSpy.calledOnce);
          assert.isTrue(addNamedSpy.getCall(0).args[0] === mockFile);
          setTimeout(function(){

            assert.isTrue(createNotificationStub.calledOnce);
            assert.equal(
              createNotificationStub.getCall(0).args[0], 'screenshotSaved');
            assert.equal(
              createNotificationStub.getCall(0).args[2],
              'style/icons/Gallery.png');
            assert.isTrue(notificationShowStub.calledOnce);
            done();
          });
        });
      });
    });
});
