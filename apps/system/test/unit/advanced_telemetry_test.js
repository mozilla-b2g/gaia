'use strict';

/* global AdvancedTelemetry, MockasyncStorage, MockNavigatorSettings, Gzip,
   AdvancedTelemetryPing, MockLazyLoader */

require('/shared/js/settings_listener.js');
require('/shared/js/uuid.js');
require('/shared/js/telemetry.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/gzip/gzip.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/js/advanced_telemetry.js');
requireApp('system/js/app_usage_metrics.js');
requireApp('system/test/unit/mock_lazy_loader.js');


suite('AdvancedTelemetry:', function() {
  var realMozSettings, realOnLine, realPerformanceNow;
  var isOnLine = true;
  var payloadOld = {
    keyedHistograms: {
      DEV_TOOLS_MEMORY: {
        verticalhome: {
          min: 1,
          max: 1000,
          histogram_type: 0,
          sum: 58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        },
        settings: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        }
      },
      DEV_TOOLS_STARTUP: {
        verticalhome: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        },
        settings: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        }
      }
    },
    addonHistograms: {
      COMM_SMS: {
        min: 1,
        max: 1000,
        histogram_type:0,
        sum:58,
        log_sum: 10.935960054397583,
        log_sum_squares: 29.95399808883667,
        ranges: [0,1,2,5,12,29,70,170,412,1000],
        counts:[0,0,0,0,4,0,0,0,0,0]
      }
    }
  };

  var payloadNew = {
    keyedHistograms: {
      DEV_TOOLS_MEMORY: {
        verticalhome: {
          min: 1,
          max: 1000,
          histogram_type: 0,
          sum: 58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        },
        settings: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        },
        calendar: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        }
      },
      DEV_TOOLS_STARTUP: {
        verticalhome: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        },
        settings: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        }
      },
      DEV_TOOLS_JANK: {
        verticalhome: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        },
        settings: {
          min: 1,
          max: 1000,
          histogram_type:0,
          sum:58,
          log_sum: 10.935960054397583,
          log_sum_squares: 29.95399808883667,
          ranges: [0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]
        }
      }
    },
    addonHistograms: {
      COMM_SMS: {
        min: 1,
        max: 1000,
        histogram_type:0,
        sum:58,
        log_sum: 10.935960054397583,
        log_sum_squares: 29.95399808883667,
        ranges: [0,1,2,5,12,29,70,170,412,1000],
        counts:[0,0,0,0,4,0,0,0,0,0]
      },
      COMM_DIALER: {
        min: 1,
        max: 1000,
        histogram_type:0,
        sum:58,
        log_sum: 10.935960054397583,
        log_sum_squares: 29.95399808883667,
        ranges: [0,1,2,5,12,29,70,170,412,1000],
        counts:[0,0,0,0,4,0,0,0,0,0]
      }
    }
  };

  var mergedPayload = {
    keyedHistograms:{
      DEV_TOOLS_MEMORY:{
        verticalhome:{
          min:1,max:1000,histogram_type:0,
          sum:116,
          log_sum:21.871920108795166,
          log_sum_squares:59.90799617767334,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,8,0,0,0,0,0]},
        settings:{
          min:1,max:1000,histogram_type:0,
          sum:116,
          log_sum:21.871920108795166,
          log_sum_squares:59.90799617767334,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,8,0,0,0,0,0]},
        calendar:{
          min:1,max:1000,histogram_type:0,
          sum:58,
          log_sum:10.935960054397583,
          log_sum_squares:29.95399808883667,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]}
      },
      DEV_TOOLS_STARTUP:{
        verticalhome:{
          min:1,max:1000,histogram_type:0,
          sum:116,
          log_sum:21.871920108795166,
          log_sum_squares:59.90799617767334,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,8,0,0,0,0,0]},
        settings:{
          min:1,max:1000,histogram_type:0,
          sum:116,
          log_sum:21.871920108795166,
          log_sum_squares:59.90799617767334,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,8,0,0,0,0,0]}
      },
      DEV_TOOLS_JANK:{
        verticalhome:{
          min:1,
          max:1000,histogram_type:0,
          sum:58,
          log_sum:10.935960054397583,
          log_sum_squares:29.95399808883667,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]},
        settings:{
          min:1,max:1000,histogram_type:0,
          sum:58,
          log_sum:10.935960054397583,
          log_sum_squares:29.95399808883667,
          ranges:[0,1,2,5,12,29,70,170,412,1000],
          counts:[0,0,0,0,4,0,0,0,0,0]}
      }
    },
    addonHistograms:{
      COMM_SMS:{
        min:1,max:1000,histogram_type:0,
        sum:116,
        log_sum:21.871920108795166,
        log_sum_squares:59.90799617767334,
        ranges:[0,1,2,5,12,29,70,170,412,1000],
        counts:[0,0,0,0,8,0,0,0,0,0]},
      COMM_DIALER:{
        min:1,max:1000,histogram_type:0,
        sum:58,
        log_sum:10.935960054397583,
        log_sum_squares:29.95399808883667,
        ranges:[0,1,2,5,12,29,70,170,412,1000],
        counts:[0,0,0,0,4,0,0,0,0,0]}
    }
  };

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
    window.LazyLoader = MockLazyLoader;

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });
    navigator.addIdleObserver = function(o) {
      setTimeout(function() {
        o.onidle();
      }, o.time * 1000);
    };
    navigator.removeIdleObserver = function() {};

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

  suite('Sending the Metrics:', function() {
    var at, clock, XHR, xhr, mockSettings;
    var transmitSpy;
    var wrapper, packedWrapper;
    var gzipCompressedData = new Uint8Array([1,2,3,4,5]);

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

      packedWrapper = {
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
                range: [1, 1000],
                bucket_count:10,
                histogram_type: 0,
                values: {'5':0, '12':2, '29':1, '70':1, '170':0},
                sum: 189,
                log_sum:14.329224586486816,
                log_sum_squares: 53.6346640586853
              }
            }
          },
          addonHistograms: {
            communications: {
              rn_metric: {
                range: [1, 10000],
                bucket_count:10,
                histogram_type:1,
                values:{'0':0, '1':1, '1251':0},
                sum: 99,
                sum_squares_lo:9801,
                sum_squares_hi:0
              }
            }
          }
        }
      };

      transmitSpy = this.sinon.spy(AdvancedTelemetry.prototype, 'transmit');
      clock = this.sinon.useFakeTimers();
      XHR = sinon.useFakeXMLHttpRequest();
      XHR.onCreate = function(instance) { xhr = instance; };
      MockNavigatorSettings.mSetup();
      MockNavigatorSettings.mSyncRepliesOnly = true;
      mockSettings = MockNavigatorSettings.mSettings;
      this.sinon.stub(window, 'uuid', function() {
        return 'uuid';
      });

      this.sinon.stub(Date.prototype, 'toISOString').returns('testDate');
      mockSettings['deviceinfo.platform_build_id'] = 'build';
      mockSettings['deviceinfo.platform_version'] = '43';
      mockSettings['app.update.channel'] = 'default';
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'Enhanced';
      at = new AdvancedTelemetry();
      at.start();
      at.startCollecting();
      done();
    });

    teardown(function() {
      transmitSpy.restore();
      clock.restore();
      window.uuid.restore();
      at.stop();
      XHR.restore();
      MockasyncStorage.mTeardown();
      MockNavigatorSettings.mTeardown();
    });

    function dispatch(detail) {
      window.dispatchEvent(new CustomEvent('advanced-telemetry-update',
        {detail: detail}));
      clock.tick();
    }

    test('advanced telemetry update should call transmit', function() {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });
      at.handleGeckoMessage(payloadNew.payload, function() {
        MockNavigatorSettings.mReplyToRequests();
        assert.equal(transmitSpy.callCount, 1);
      });
    });

    test('should retry if not online', function(done) {
      isOnLine = false;
      this.sinon.spy(AdvancedTelemetry.prototype, 'startRetryBatch');
      this.sinon.spy(AdvancedTelemetry.prototype, 'clearPayload');
      at.handleGeckoMessage(payloadNew.payload, function() {
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.calledOnce(AdvancedTelemetry.prototype.startRetryBatch);
        sinon.assert.notCalled(AdvancedTelemetry.prototype.clearPayload);
        done();
      });
    });

    test('should create the XHR properly', function(done) {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });

      isOnLine = true;
      AdvancedTelemetryPing.prototype.send().then(function() {
        MockNavigatorSettings.mReplyToRequests();
        assert.ok(xhr);
        assert.equal(xhr.method, 'POST');
        done();
      });
    });

    test('should format the URL properly', function(done) {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });
      var deviceQuery = {
        'deviceinfo.platform_version': '43',
        'app.update.channel': 'default',
        'deviceinfo.platform_build_id': '34'
      };

      var atp = new AdvancedTelemetryPing({id: '1234'}, deviceQuery);
      atp.send().then(function() {
        MockNavigatorSettings.mReplyToRequests();
        // Check that the URL is properly formatted.
        // URLformat:/id/reason/appName/appVersion/appUpdateChannel/appBuildID?v=4
        var baseURL = AdvancedTelemetry.REPORT_URL;
        assert.ok(xhr.url.indexOf(baseURL) === 0);
        var path = xhr.url.substring(baseURL.length + 1).split('/');
        assert.equal(path[0], '1234');
        assert.equal(path[1], AdvancedTelemetry.REASON);
        assert.equal(path[2], AdvancedTelemetry.TELEMETRY_APP_NAME);
        assert.equal(path[3], '43');
        assert.equal(path[4], 'default');
        let version = path[5].split('?');
        assert.equal(version[0], '34');
        assert.equal(version[1], 'v=4');
        done();
      });
    });

    test('should format the body properly', function(done) {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });
      at.handleGeckoMessage(wrapper.payload, function() {
        MockNavigatorSettings.mReplyToRequests();
        var req = JSON.parse(at.request.data);
        assert.ok(req);

        assert.equal(req.type, wrapper.type);
        assert.equal(req.id, wrapper.id);
        assert.equal(req.creationDate, wrapper.creationDate);
        assert.equal(req.version, wrapper.version);
        assert.equal(req.clientId, wrapper.clientId);

        // Verify the application object picked up the settings correctly.
        assert.deepEqual(req.application, packedWrapper.application);
        // Verify that the Histograms are intact and are properly packed.
        assert.deepEqual(req.payload, packedWrapper.payload);

        done();
      });
    });

    test('advanced telemetry should gzip compression payload', function(done) {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });

      this.sinon.stub(AdvancedTelemetryPing.prototype, 'post', function() {
        return Promise.resolve();
      });

      // Even though `getData` is being stubbed, since `gzip.compress` is
      // stubbed to resolve compressed data, `post` should be called with
      // the compressed data.
      this.sinon.stub(AdvancedTelemetryPing.prototype, 'getData', function() {
        return JSON.parse(JSON.stringify(wrapper.payload));
      });

      AdvancedTelemetryPing.prototype.send().then(function() {
        MockNavigatorSettings.mReplyToRequests();
        // `post` should be called with the compressed data
        sinon.assert.calledOnce(AdvancedTelemetryPing.prototype.post);
        sinon.deepEqual(
          AdvancedTelemetryPing.prototype.post.getCall(0).args[1],
          gzipCompressedData);
        done();
      });
    });

    test('advanced telemetry should handle gzip compression failure',
      function(done) {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.reject('compress error');
      });

      this.sinon.stub(AdvancedTelemetryPing.prototype, 'post', function() {
        return Promise.resolve();
      });

      // `gzip.compress` is stubbed to "reject" therefore `post` should be
      // called with the original, uncompressed payload.
      this.sinon.stub(AdvancedTelemetryPing.prototype, 'getData', function() {
        return JSON.parse(JSON.stringify(wrapper.payload));
      });

      AdvancedTelemetryPing.prototype.send().then(function() {
        MockNavigatorSettings.mReplyToRequests();
        // `post` should be called with the uncompressed payload
        sinon.assert.calledOnce(AdvancedTelemetryPing.prototype.post);
        sinon.deepEqual(
          AdvancedTelemetryPing.prototype.post.getCall(0).args[1],
          wrapper.payload);
        done();
      });
    });

    test('should retry on a timeout error', function(done) {
      var retryspy = this.sinon.spy(window, 'setTimeout');
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });
      this.sinon.stub(console, 'info').returns(0);
      dispatch({payload: wrapper.payload});

      // Simulate a timeout
      xhr.ontimeout(new CustomEvent('timeout'));
      assert.equal(retryspy.getCall(0).args[1],
        AdvancedTelemetry.RETRY_INTERVAL);
      done();
    });

    test('should retry interval after failed transmit', function(done) {
      var retryspy = this.sinon.spy(window, 'setTimeout');
      this.sinon.stub(console, 'info').returns(0);
      dispatch({payload: wrapper.payload});

      // Simulate a timeout
      xhr.ontimeout(new CustomEvent('error'));
      assert.equal(retryspy.getCall(0).args[1],
        AdvancedTelemetry.RETRY_INTERVAL);
      done();
    });

    test('should clear out the payload after a successful transmit',
    function(done) {
      this.sinon.stub(Gzip, 'compress', function() {
        return Promise.resolve(gzipCompressedData);
      });
      this.sinon.spy(AdvancedTelemetry.prototype, 'clearPayload');
      this.sinon.stub(console, 'info').returns(0);
      at.handleGeckoMessage(wrapper.payload, function() {
        // Simulate a successful send
        xhr.onload(new CustomEvent('load'));
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.calledOnce(AdvancedTelemetry.prototype.clearPayload);
        done();
      });
    });

    test('should clear out the payload after a successful merge',
    function(done) {
      this.sinon.spy(AdvancedTelemetry.prototype, 'clearPayload');
      this.sinon.stub(console, 'info').returns(0);
      at.merge = true;
      at.handleGeckoMessage(wrapper.payload, function() {
        sinon.assert.calledOnce(AdvancedTelemetry.prototype.clearPayload);
        sinon.assert.calledWith(AdvancedTelemetry.prototype.clearPayload,
          false);
        done();
      });
    });

    test('should NOT clear out the payload after a failed transmit',
    function(done) {
      this.sinon.spy(AdvancedTelemetry.prototype, 'clearPayload');
      this.sinon.stub(console, 'info').returns(0);
      at.handleGeckoMessage(wrapper.payload, function() {
        // Simulate an error
        xhr.ontimeout(new CustomEvent('error'));
        sinon.assert.notCalled(AdvancedTelemetry.prototype.clearPayload);
        done();
      });
    });

    test('should NOT clear out the payload after a transmit timeout',
    function(done) {
      this.sinon.spy(AdvancedTelemetry.prototype, 'clearPayload');
      this.sinon.stub(console, 'info').returns(0);
      at.handleGeckoMessage(wrapper.payload, function() {
        // Simulate a timeout
        xhr.ontimeout(new CustomEvent('timeout'));
        sinon.assert.notCalled(AdvancedTelemetry.prototype.clearPayload);
        done();
      });
    });
  });

  suite('Enable/disable:', function() {
    var mockSettings, at, clock;

    setup(function() {
      MockNavigatorSettings.mSetup();
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
      MockNavigatorSettings.mTeardown();
    });

    test('starts immediately if enabled', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'Enhanced';
      at.start();
      clock.tick();

      sinon.assert.notCalled(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.startCollecting);
      done();
    });

    test('does not start if not enabled', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'None';
      at.start();
      clock.tick();

      sinon.assert.calledOnce(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.notCalled(AdvancedTelemetry.prototype.startCollecting);
      done();
    });

    test('starts when enabled', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'None';

      at.start();
      clock.tick();
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.notCalled(AdvancedTelemetry.prototype.startCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'Enhanced';
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: 'Enhanced' });
      clock.tick();
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.startCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'None';
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: 'None' });
      clock.tick();

      done(sinon.assert.calledTwice(
        AdvancedTelemetry.prototype.stopCollecting));
    });

    test('stops when disabled and starts again', function(done) {
      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'Enhanced';
      at.start();
      clock.tick();
      sinon.assert.notCalled(AdvancedTelemetry.prototype.stopCollecting);
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.startCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'None';
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: 'None' });
      clock.tick();
      sinon.assert.calledOnce(AdvancedTelemetry.prototype.stopCollecting);

      mockSettings[AdvancedTelemetry.TELEMETRY_ENABLED_KEY] = 'Enhanced';
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetry.TELEMETRY_ENABLED_KEY, { settingValue: 'Enhanced' });
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

  suite('Merging Metrics:', function() {
    var mockSettings, at, clock;
    // The old, and new payloads are setup to make sure that the merged
    // payload properly reflects: 1) An item in the old that is not in the new,
    // 2) An item in the new that is not in the old, and 3) the addition of the
    // histogram elements is done correctly for sum, log_sum, and
    // log_sum_squares.

    setup(function() {
      mockSettings = MockNavigatorSettings.mSettings;
      clock = this.sinon.useFakeTimers();
      this.sinon.spy(MockasyncStorage, 'setItem');
      this.sinon.spy(AdvancedTelemetry.prototype, 'transmit');
      at = new AdvancedTelemetry();
      clock.tick();
    });

    teardown(function(done) {
      at.stop();
      clock.tick();
      MockasyncStorage.mTeardown();
      done();
    });

    test('should merge correctly with no previous metrics', function() {
      at.mergeMetrics(payloadNew);
      sinon.assert.calledOnce(MockasyncStorage.setItem);
      // The calledWith does a deepEqual check on all the JSON elements.
      sinon.assert.calledWith(MockasyncStorage.setItem,
        AdvancedTelemetry.METRICS_KEY, payloadNew);
    });

    test('should merge correct with metrics with existing metrics', function() {
      // Make a clone so we don't modify it for subsequent tests.
      var cloneOldPayload = JSON.parse(JSON.stringify(payloadOld));

      MockasyncStorage.setItem(AdvancedTelemetry.METRICS_KEY, cloneOldPayload);
      at.mergeMetrics(payloadNew);
      // Called once above for test setup.
      sinon.assert.calledTwice(MockasyncStorage.setItem);
      // The calledWith does a deepEqual check on all the JSON elements.
      sinon.assert.calledWith(MockasyncStorage.setItem,
        AdvancedTelemetry.METRICS_KEY, mergedPayload);
    });
  });
});
