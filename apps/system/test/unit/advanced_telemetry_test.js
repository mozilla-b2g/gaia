'use strict';

/* global AdvancedTelemetry, MockasyncStorage, MockNavigatorSettings  */

require('/shared/js/settings_listener.js');
require('/shared/js/uuid.js');
require('/shared/js/telemetry.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/js/advanced_telemetry.js');
requireApp('system/js/app_usage_metrics.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');


suite('AdvancedTelemetry:', function() {
  var realMozSettings, realOnLine, realPerformanceNow;
  var isOnLine = true;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    window.asyncStorage = MockasyncStorage;

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    realPerformanceNow = window.performance.now;
    window.performance.now = function() { return Date.now(); };
    AdvancedTelemetry.DEBUG = false;
    AdvancedTelemetry.LOGINFO = false;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    delete window.asyncStorage;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    } else {
      delete navigator.onLine;
    }
    window.performance.now = realPerformanceNow;
  });

  teardown(function() {
  });

  suite('Sending the Metrics:', function() {
    var at, clock, XHR, xhr, mockSettings;
    var transmitSpy;
    var wrapper;

    setup(function(done) {
      wrapper = {
      type: AdvancedTelemetry.REASON,
        id: 'uuid',
        creationDate: 'testDate',
        version: AdvancedTelemetry.TELEMETRY_VERSION,
        application: {
          architecture: 'arm',
          buildId: 'build',
          name: AdvancedTelemetry.TELEMETRY_APP_NAME,
          version: '43',
          vendor: 'Mozilla',
          platformVersion: '43',
          xpcomAbi: 'arm-gcc3',
          channel: 'default'
        },
        clientId: 'uuid',
        payload: {
          keyedHistograms: {
            DEVTOOLS_HUD_REFLOW_DURATION: {
              verticalhome: {
                min: 1,
                max: 1000,
                histogram_type: 0,
                sum: 189,
                log_sum: 14.329224586486816,
                log_sum_squares: 53.6346640586853,
                ranges: [0, 1, 2, 5, 12, 29, 70, 170, 412, 1000],
                counts: [0, 0, 0, 0, 2, 1, 1, 0, 0, 0]
              }
            }
          },
          addonHistograms: {
            communications: {
              rn_metric: {
                min: 1,
                max: 10000,
                histogram_type: 1,
                sum: 99,
                sum_squares_lo: 9801,
                sum_squares_hi: 0,
                ranges: [0, 1, 1251, 2501, 3751, 5001, 6250, 7500, 8750, 10000],
                counts: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0]
              }
            }
          }
        }
      };

      transmitSpy = this.sinon.spy(AdvancedTelemetry.prototype, 'transmit');
      clock = this.sinon.useFakeTimers();
      XHR = sinon.useFakeXMLHttpRequest();
      XHR.onCreate = function(instance) { xhr = instance; };
      mockSettings = MockNavigatorSettings.mSettings;
      this.sinon.stub(window, 'uuid', function() {
        return 'uuid';
      });

      this.sinon.stub(Date.prototype, 'toISOString').returns('testDate');
      mockSettings['deviceinfo.platform_build_id'] = 'build';
      mockSettings['deviceinfo.platform_version'] = '43';
      mockSettings['app.update.channel'] = 'default';
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = true;
      at = new AdvancedTelemetry();
      at.start();
      clock.tick();
      done();
    });

    teardown(function() {
      transmitSpy.restore();
      at.stop();
      XHR.restore();
    });

    function dispatch(detail) {
      window.dispatchEvent(new CustomEvent('advanced-telemetry-update',
        {detail: detail}));
      clock.tick();
    }

    test('advanced telemetry update should call transmit', function() {
      dispatch({payload: wrapper.payload});
      assert.equal(transmitSpy.callCount, 1);
    });

    test('should not transmit if not online', function(done) {
      isOnLine = false;

      assert.equal(transmitSpy.callCount, 0);
      dispatch({payload: wrapper.payload});
      assert.equal(transmitSpy.callCount, 0);

      done();
    });

    test('should create the XHR properly', function(done) {
      dispatch({payload: wrapper.payload});

      assert.ok(xhr);
      assert.equal(xhr.method, 'POST');
      done();
    });

    test('should format the URL properly', function(done) {
      dispatch({payload: wrapper.payload});

      // Check that the URL is properly formatted.
      // URLformat:/id/reason/appName/appVersion/appUpdateChannel/appBuildID?v=4
      var baseURL = AdvancedTelemetry.REPORT_URL;
      assert.ok(xhr.url.indexOf(baseURL) === 0);

      var path = xhr.url.substring(baseURL.length + 1).split('/');
      assert.equal(path[0], 'uuid');
      assert.equal(path[1], AdvancedTelemetry.REASON);
      assert.equal(path[2], AdvancedTelemetry.TELEMETRY_APP_NAME);
      assert.equal(path[3], '43');
      assert.equal(path[4], 'default');
      let version = path[5].split('?');
      assert.equal(version[0], 'build');
      assert.equal(version[1], 'v=4');
      done();
    });

    test('should format the body properly', function(done) {
      dispatch({payload: wrapper.payload});
      var req = JSON.parse(xhr.requestBody);
      assert.ok(req);

      assert.equal(req.type, wrapper.type);
      assert.equal(req.id, wrapper.id);
      assert.equal(req.creationDate, wrapper.creationDate);
      assert.equal(req.version, wrapper.version);
      assert.equal(req.clientId, wrapper.clientId);

      // Verify the application object picked up the settings correctly.
      assert.deepEqual(req.application, wrapper.application);
      // Verify that the Histograms are intact.
      assert.deepEqual(req.payload.payload, wrapper.payload);
      done();
    });

    test('should refresh the payload on a timeout retry', function(done) {
      this.sinon.stub(console, 'info').returns(0);
      this.sinon.spy(AdvancedTelemetry.prototype, 'getPayload');
      dispatch({payload: wrapper.payload});

      // Simulate a timeout
      sinon.assert.notCalled(AdvancedTelemetry.prototype.getPayload);
      xhr.ontimeout(new CustomEvent('timeout'));
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.getPayload);
      done();
    });

    test('should refresh the payload after failed transmit', function(done) {
      this.sinon.spy(AdvancedTelemetry.prototype, 'getPayload');
      this.sinon.stub(console, 'info').returns(0);
      dispatch({payload: wrapper.payload});

      // Simulate a timeout
      sinon.assert.notCalled(AdvancedTelemetry.prototype.getPayload);
      xhr.ontimeout(new CustomEvent('error'));
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.getPayload);
      done();
    });

    test('should clear out the payload after a successful transmit',
    function(done) {
      this.sinon.spy(AdvancedTelemetry.prototype, 'clearPayload');
      this.sinon.stub(console, 'info').returns(0);
      dispatch({payload: wrapper.payload});

      // Simulate a successful send
      xhr.onload(new CustomEvent('load'));
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.clearPayload);
      done();
    });
  });

  suite('Enable/disable:', function() {
    var mockSettings, at, clock;

    setup(function() {
      mockSettings = MockNavigatorSettings.mSettings;
      clock = this.sinon.useFakeTimers();
      this.sinon.spy(AdvancedTelemetry.prototype, 'startCollecting');
      this.sinon.spy(AdvancedTelemetry.prototype, 'stopCollecting');
      at = new AdvancedTelemetry();
      clock.tick();
    });

    teardown(function() {
      at.stop();
      clock.tick();
    });

    test('starts immediately if enabled', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = true;
      at.start();
      clock.tick();

      sinon.assert.notCalled(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.startCollecting);
      done();
    });

    test('does not start if not enabled', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = false;
      at.start();
      clock.tick();

      sinon.assert.calledOnce(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.notCalled(AdvancedTelemetry.prototype.startCollecting);
      done();
    });

    test('starts when enabled', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = false;

      at.start();
      clock.tick();
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.notCalled(AdvancedTelemetry.prototype.startCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: true });
      clock.tick();
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.startCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: false });
      clock.tick();

      done(sinon.assert.calledTwice(
        AdvancedTelemetry.prototype.stopCollecting));
    });

    test('stops when disabled and starts again', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = true;
      at.start();
      clock.tick();
      sinon.assert.notCalled(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.startCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: false });
      clock.tick();
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.stopCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: true });
      clock.tick();
      sinon.assert.calledTwice(AdvancedTelemetry.prototype.startCollecting);
      done();
    });
  });

  suite('Batch Timings:', function() {
    var BatchTiming, clock;
    suiteSetup(function() {
      BatchTiming = AdvancedTelemetry.BatchTiming;
    });

    setup(function () {
      clock = this.sinon.useFakeTimers();
    });

    test('should set full interval the first time', function (done) {
      this.sinon.stub(Date, 'now').returns(2);
      var bt = new BatchTiming(true);
      bt.getInterval();
      window.asyncStorage.getItem(AdvancedTelemetry.BATCH_KEY, function(value) {
        assert.equal(value, '2');
        done();
      });
    });

    test('should set full interval after a batch send', function (done) {
      this.sinon.stub(Date, 'now').returns(2);
      var bt = new BatchTiming();
      bt.getInterval();
      window.asyncStorage.getItem(AdvancedTelemetry.BATCH_KEY,
                                  function (value) {
        assert.equal(value, '2');
        done();
      });
    });

    test('should not modify the start time if existing time', function (done) {
      MockasyncStorage[AdvancedTelemetry.BATCH_KEY] = '2';
      var bt = new BatchTiming(true);
      bt.getInterval();
      window.asyncStorage.getItem(AdvancedTelemetry.BATCH_KEY,
                                  function (value) {
        assert.equal(value, '2');
        done();
      });
    });

    test('should recalculate the interval correctly if existing time set',
    function (done) {
      MockasyncStorage.setItem(AdvancedTelemetry.BATCH_KEY, 1437671946520);
      clock.tick();
      this.sinon.stub(Date, 'now').returns(1437671946521);

      var bt = new BatchTiming(true);
      window.asyncStorage.getItem(AdvancedTelemetry.BATCH_KEY,
                                  function (value) {
        assert.equal(value, 1437671946520);
        assert.equal(bt.getInterval(), 1);
        done();
      });
    });

    test('should safeguard an interval being set for too long',
    function (done) {
      MockasyncStorage.setItem(AdvancedTelemetry.BATCH_KEY, 1437681946521);
      clock.tick();
      this.sinon.stub(Date, 'now').returns(1487681946521);

      var bt = new BatchTiming(true);
      window.asyncStorage.getItem(AdvancedTelemetry.BATCH_KEY,
                                  function (value) {
        assert.equal(value, 1487681946521);
        assert.equal(bt.getInterval(), AdvancedTelemetry.REPORT_INTERVAL);
        done();
      });
    });
  });
});
