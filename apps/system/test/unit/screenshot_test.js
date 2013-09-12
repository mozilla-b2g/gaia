'use strict';

mocha.globals(['addEventListener']);

requireApp('system/test/unit/mock_l10n.js');

var MockAddEventListener_callbacks = {};
var MockDeviceStorage = {
  availreq: {
    result: null,
    error: {}
  },
  freereq: {
    result: null,
    error: {}
  },
  saveRequest: { error: {} },

  available: function available() {
    return this.availreq;
  },
  freeSpace: function freeSpace() {
    return this.freereq;
  },
  addNamed: function addNamed(file, filename) {
    return this.saveRequest;
  }
};
var MockMozNotification = {
  mTitle: null,
  mBody: null,
  mPath: null,
  mNotification: {
    calledTimes: 0,
    show: function show() {
      this.calledTimes++;
    }
  },
  createNotification: function createNotification(title, body, path) {
    this.mTitle = title;
    this.mBody = body;
    this.mPath = path;
    return this.mNotification;
  }
};

suite('system/Screenshot', function() {

  var realL10n;
  var realMozNotification;
  var realGetDeviceStorage;

  var stubAddEventListener;
  var stubGetDeviceStorage;

  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozNotification = navigator.mozNotification;
    Object.defineProperty(navigator, 'mozNotification', {
      writable: true
    });
    navigator.mozNotification = MockMozNotification;

    realGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = function(obj) {
      return MockDeviceStorage;
    };

    stubAddEventListener =
    this.sinon.stub(window, 'addEventListener', function(evt, callback) {
      MockAddEventListener_callbacks[evt] = callback;
    });

    requireApp('system/js/screenshot.js', done);
  });
  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozNotification = realMozNotification;
    navigator.getDeviceStorage = realGetDeviceStorage;

    stubAddEventListener.restore();
  });

  suite('Callback home+sleep', function() {
    test('Test home+sleep onsuccess when state == unavailable', function() {
      var mVb_times = 0;
      var stubVibrate =
      this.sinon.stub(navigator, 'vibrate', function(vb_times) {
        mVb_times = vb_times;
      });

      MockDeviceStorage.availreq.result = 'unavailable';

      MockAddEventListener_callbacks['home+sleep']();
      MockDeviceStorage.availreq.onsuccess();

      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');
      assert.equal(MockMozNotification.mBody, 'screenshotNoSDCard');
      assert.equal(mVb_times, 100);

      stubVibrate.restore();
    });

    test('Test home+sleep onsuccess when state == shared', function() {
      MockDeviceStorage.availreq.result = 'shared';

      MockAddEventListener_callbacks['home+sleep']();
      MockDeviceStorage.availreq.onsuccess();

      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');
      assert.equal(MockMozNotification.mBody, 'screenshotSDCardInUse');
    });

    test('Test home+sleep onsuccess when state == available &&' +
    'freereq.result < MAX_SCREENSHOT_SIZE', function() {
      MockDeviceStorage.availreq.result = 'available';
      MockDeviceStorage.freereq.result = 0;

      MockAddEventListener_callbacks['home+sleep']();
      MockDeviceStorage.availreq.onsuccess();
      MockDeviceStorage.freereq.onsuccess();

      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');
      assert.equal(MockMozNotification.mBody, 'screenshotSDCardLow');
    });

    test('Test home+sleep onsuccess when state == available &&' +
    'freereq.result >= MAX_SCREENSHOT_SIZE', function(done) {
      var stubDispatchEvent =
      this.sinon.stub(window, 'dispatchEvent', function(evt) {
        assert.equal(evt.type, 'mozContentEvent');
        assert.equal(evt.detail.type, 'take-screenshot');

        stubDispatchEvent.restore();
        done();
      });

      MockDeviceStorage.availreq.result = 'available';
      MockDeviceStorage.freereq.result =
      (window.innerWidth * window.innerHeight * 4 + 4096) + 1;

      MockAddEventListener_callbacks['home+sleep']();
      MockDeviceStorage.availreq.onsuccess();
      MockDeviceStorage.freereq.onsuccess();
    });

    test('Test availreq.onerror', function() {
      MockMozNotification.mTitle = null;
      MockMozNotification.mBody = null;

      MockDeviceStorage.freereq.error.name = 'dummy_freereq_error_name';
      MockDeviceStorage.freereq.onerror();

      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');
      assert.equal(MockMozNotification.mBody, 'dummy_freereq_error_name');
    });

    test('Test freereq.error', function() {
      MockMozNotification.mTitle = null;
      MockMozNotification.mBody = null;

      MockDeviceStorage.availreq.error.name = 'dummy_availreq_error_name';
      MockDeviceStorage.availreq.onerror();

      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');
      assert.equal(MockMozNotification.mBody, 'dummy_availreq_error_name');
    });
  });

  suite('Callback mozChromeEvent', function() {
    test('Test event type take-screenshot-success', function() {
      var fakeEvt = {
        detail: {
          type: 'take-screenshot-success',
          file: 'dummy_file'
        }
      };

      var mVb_times = 0;
      var stubVibrate =
      this.sinon.stub(navigator, 'vibrate', function(vb_times) {
        mVb_times = vb_times;
      });

      MockDeviceStorage.availreq.result = 'available';
      MockDeviceStorage.freereq.result =
      (window.innerWidth * window.innerHeight * 4 + 4096) + 1;

      MockAddEventListener_callbacks['mozChromeEvent'](fakeEvt);

      MockDeviceStorage.availreq.onsuccess();
      MockDeviceStorage.freereq.onsuccess();

      MockDeviceStorage.saveRequest.onsuccess();
      assert.equal(MockMozNotification.mTitle, 'screenshotSaved');
      assert.equal(mVb_times, 100);

      MockDeviceStorage.saveRequest.onerror();
      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');

      stubVibrate.restore();
    });

    test('Test event type take-screenshot-error', function() {
      var fakeEvt = {
        detail: {
          type: 'take-screenshot-error',
          file: 'dummy_file'
        }
      };

      MockDeviceStorage.availreq.result = 'available';
      MockDeviceStorage.freereq.result =
      (window.innerWidth * window.innerHeight * 4 + 4096) + 1;

      MockAddEventListener_callbacks['mozChromeEvent'](fakeEvt);

      MockDeviceStorage.availreq.onsuccess();
      MockDeviceStorage.freereq.onsuccess();

      assert.equal(MockMozNotification.mTitle, 'screenshotFailed');
    });
  });
});
