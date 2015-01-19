'use strict';

/* global AppUsageMetrics, MockasyncStorage, MockNavigatorSettings,
          MockSIMSlotManager, MockAppsMgmt, MockApp, MockApplications,
          MockLazyLoader  */


require('/shared/js/settings_listener.js');
require('/shared/js/telemetry.js');
require('/shared/js/uuid.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/app_usage_metrics.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_simslot.js');

requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_applications.js');

/*
 * This test suite has several sub-suites that verify that:
 * 1) methods of the UsageData class properly record data
 * 2) window management events property call UsageData methods
 * 3) the getSettings() utility method works as expected
 * 4) changes to the telemetry opt-in setting enable and disable app usage
 *    metrics collection
 * 5) metrics are properly transmitted, at the proper time, and that
 *    retries are handled correctly after a transmission failure.
 */
suite('AppUsageMetrics:', function() {
  var realMozSettings, realOnLine, realSIMSlotManager, realPerformanceNow,
      realMozApps, realApplications;
  var isOnLine = true;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realSIMSlotManager = window.SIMSlotManager;
    realMozApps = navigator.mozApps;
    navigator.mozSettings = MockNavigatorSettings;
    window.asyncStorage = MockasyncStorage;
    window.SIMSlotManager = MockSIMSlotManager;
    window.LazyLoader = MockLazyLoader;

    navigator.mozApps = { mgmt: MockAppsMgmt };
    navigator.addIdleObserver = function(o) {
      setTimeout(function() {
        o.onidle();
      }, o.time * 1000);
    };
    navigator.removeIdleObserver = function() {};

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    realPerformanceNow = window.performance.now;
    window.performance.now = function() { return Date.now(); };

    realApplications = window.applications;
    window.applications = MockApplications;
    window.applications.ready = true;
    AppUsageMetrics.DEBUG = false; // Shut up console output in test logs
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.SIMSlotManager = realSIMSlotManager;
    navigator.mozApps = realMozApps;
    delete window.asyncStorage;

    delete navigator.addIdleObserver;
    delete navigator.removeIdleObserver;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    } else {
      delete navigator.onLine;
    }

    window.performance.now = realPerformanceNow;
    window.applications = realApplications;
  });

  teardown(function() {
    MockAppsMgmt.mTeardown();
  });

  /*
   * First we test that the internal UsageData class works as expected and
   * that calls to its record methods actually produce the expected data
   */
  suite('UsageData:', function() {
    var UsageData, clock;
    var app1, app2, app3;

    suiteSetup(function() {
      UsageData = AppUsageMetrics.UsageData;
    });

    setup(function() {
      clock = this.sinon.useFakeTimers();
      app1 = new MockApp({ manifest: { type: 'certified' } });
      app2 = new MockApp({ manifest: { type: 'certified' } });
      app3 = new MockApp({ manifest: { type: 'certified' } });
      MockAppsMgmt.mApps = [app1, app2, app3];
    });

    function getUsage(metrics, app) {
      return metrics.getAppUsage(app.manifestURL);
    }

    test('isEmpty method', function() {
      var metrics = new UsageData();
      assert.equal(metrics.isEmpty(), true);
      metrics.recordInstall(app1);
      assert.equal(metrics.isEmpty(), false);
    });

    test('empty initial app usage', function() {
      var metrics = new UsageData();
      var usage = getUsage(metrics, app1);
      assert.equal(usage.usageTime, 0);
      assert.equal(usage.invocations, 0);
      assert.equal(usage.installs, 0);
      assert.equal(usage.uninstalls, 0);
      assert.isObject(usage.activities);
      assert.equal(Object.keys(usage.activities).length, 0);
    });

    test('start time', function() {
      clock.tick(99);
      var metrics = new UsageData();
      assert.equal(Date.now(), metrics.startTime());
    });

    suite('should track app', function() {
      var metrics, invalidApp, undefOriginApp;

      setup(function() {
        metrics = new UsageData();
        invalidApp = new MockApp({
          manifestURL: 'foobar',
          installOrigin: 'http://www.foo.com'
        });

        undefOriginApp = {
          installOrigin: 'https://marketplace.firefox.com',
          manifestURL: 'https://marketplace.firefox.com/app/1-2-3-4'
        };

        MockApplications.mRegisterMockApp(undefOriginApp);
      });

      function getInvalidAppUsage() {
        return getUsage(metrics, invalidApp);
      }

      test('valid apps', function() {
        // Certified app w/o marketplace origin
        assert.ok(metrics.shouldTrackApp(app1));

        // Non-certified app w/ marketplace origin
        assert.ok(metrics.shouldTrackApp(new MockApp({
          installOrigin: 'https://marketplace.firefox.com'
        })));

        // Certified app w/ marketplace origin
        assert.ok(metrics.shouldTrackApp(new MockApp({
          installOrigin: 'https://marketplace.firefox.com',
          manifest: {
            type: 'certified'
          }
        })));

        // Non-certified gaiamobile app
        assert.ok(metrics.shouldTrackApp(new MockApp()));

        // Marketplace app w/o installOrigin. This ensures we
        // get the installOrigin from the applications cache if
        // the installOrigin is not sent in an appopened event.
        // See Bug 1137063
        assert.ok(metrics.shouldTrackApp(new MockApp({
          manifestURL: undefOriginApp.manifestURL
        })));
      });

      test('invalid apps', function() {
        assert.ok(!metrics.shouldTrackApp(null));
        assert.ok(!metrics.shouldTrackApp(invalidApp));
      });

      test('doesn\'t record install/uninstall', function() {
        var recorded = metrics.recordInstall(invalidApp);
        assert.equal(getInvalidAppUsage().installs, 0);
        assert.ok(!recorded);

        recorded = metrics.recordInstall(invalidApp);
        assert.equal(getInvalidAppUsage().uninstalls, 0);
        assert.ok(!recorded);
      });

      test('doesn\'t record invocation/activity', function() {
        var recorded = metrics.recordInvocation(invalidApp, 10000);
        assert.equal(getInvalidAppUsage().invocations, 0);
        assert.equal(getInvalidAppUsage().usageTime, 0);
        assert.ok(!recorded);

        recorded = metrics.recordActivity(invalidApp, 'activity');
        assert.equal(Object.keys(getInvalidAppUsage().activities).length, 0);
        assert.ok(!('activity' in getInvalidAppUsage().activities));
        assert.ok(!recorded);
      });
    });

    test('record install', function() {
      var metrics = new UsageData();
      metrics.recordInstall(app1);
      assert.equal(getUsage(metrics, app1).installs, 1);
      metrics.recordInstall(app1);
      assert.equal(getUsage(metrics, app1).installs, 2);
    });

    test('record uninstall', function() {
      var metrics = new UsageData();
      metrics.recordUninstall(app1);
      assert.equal(getUsage(metrics, app1).uninstalls, 1);
      metrics.recordUninstall(app1);
      assert.equal(getUsage(metrics, app1).uninstalls, 2);
    });

    test('record invocation', function() {
      var metrics = new UsageData();
      metrics.recordInvocation(app1, 10000);
      assert.equal(getUsage(metrics, app1).invocations, 1);
      assert.equal(getUsage(metrics, app1).usageTime, 10);
      metrics.recordInvocation(app1, 10000);
      assert.equal(getUsage(metrics, app1).invocations, 2);
      assert.equal(getUsage(metrics, app1).usageTime, 20);
    });

    test('record activity', function() {
      var metrics = new UsageData();
      metrics.recordInvocation(app1, 10000);
      assert.equal(Object.keys(getUsage(metrics, app1).activities).length,
                   0);
      metrics.recordActivity(app1, 'app2');
      assert.equal(Object.keys(getUsage(metrics, app1).activities).length,
                   1);
      assert.equal(getUsage(metrics, app1).activities.app2, 1);
      metrics.recordActivity(app1, 'app2');
      assert.equal(Object.keys(getUsage(metrics, app1).activities).length,
                   1);
      assert.equal(getUsage(metrics, app1).activities.app2, 2);

      metrics.recordActivity(app1, 'app3');
      assert.equal(Object.keys(getUsage(metrics, app1).activities).length,
                   2);
      assert.equal(getUsage(metrics, app1).activities.app3, 1);
    });

    function recordStuff(usage) {
      usage.recordInstall(app3);
      usage.recordUninstall(app3);
      usage.recordInvocation(app1, 10000);
      usage.recordInvocation(app2, 20000);
      usage.recordActivity(app2, 'app3');
      usage.recordSearch('provider1');
    }

    test('merge', function() {
      var data1 = new UsageData();
      var data2 = new UsageData();

      // Record some stuff in both
      recordStuff(data1);
      recordStuff(data2);

      // They should be equal.
      // They will have different relativeStartTime properties, so we
      // only compare the data part of the two objects.
      assert.deepEqual(data1.data, data2.data);

      // Change the clock and create a new data structure
      clock.tick(100);
      var data3 = new UsageData();

      // Record more stuff in data 1 and in data 3
      recordStuff(data1);
      recordStuff(data3);

      // They're not equal now
      assert.notDeepEqual(data1.data, data2.data);

      // Merge data 3 into data2 and they should be equal again
      data2.merge(data3);
      assert.deepEqual(data1.data, data2.data);

      // merging with an empty object is a no-op
      var copy1 = JSON.parse(JSON.stringify(data1.data));
      data1.merge(new UsageData());
      var copy2 = JSON.parse(JSON.stringify(data1.data));
      assert.deepEqual(copy1, copy2);
    });

    test('save and load', function(done) {
      var data1 = new UsageData();
      recordStuff(data1);
      data1.save();
      clock.tick(100000);
      UsageData.load(function(data2) {
        done(assert.deepEqual(data1.data, data2.data));
      });
    });

    test('getDayKey', function() {
      var data = new UsageData();
      assert.equal(data.getDayKey(new Date(2015, 0, 12)), '20150112');
    });

    test('record search', function() {
      var metrics = new UsageData();
      metrics.recordSearch('provider1');
      metrics.recordSearch('provider2');
      assert.equal(metrics.getSearchCounts('provider1').count, 1);
      assert.equal(metrics.getSearchCounts('provider2').count, 1);

      metrics.recordSearch('provider2');
      assert.equal(metrics.getSearchCounts('provider2').count, 2);
    });
  });

  /*
   * This second suite follows up on the first. It tests that window management
   * events produce the expected calls to the record functions of the UsageData
   * class. In this suite we used fake timers, so we have to also fake
   * performance.now in order to get away with that.
   */
  suite('event handling:', function() {
    var aum;
    var realSettingsListener;
    var installSpy, uninstallSpy, invocationSpy, activitySpy, searchSpy;
    var app1, app2, app3, homescreen, lockscreen, callscreen, attention1;
    var clock;

    setup(function(done) {
      // Break SettingsListener so we don't start or stop on our own
      realSettingsListener = window.SettingsListener;
      window.SettingsListener = {
        observe: function() {},
        unobserve: function() {}
      };
      window.performance.now = function() { return Date.now(); };


      // Monitor UsageData calls
      var proto = AppUsageMetrics.UsageData.prototype;
      installSpy = this.sinon.spy(proto, 'recordInstall');
      uninstallSpy = this.sinon.spy(proto, 'recordUninstall');
      invocationSpy = this.sinon.spy(proto, 'recordInvocation');
      activitySpy = this.sinon.spy(proto, 'recordActivity');
      searchSpy = this.sinon.spy(proto, 'recordSearch');

      // Create and initialize an AUM instance. It won't start automatically
      aum = new AppUsageMetrics();
      aum.start();

      // Start it up so it is ready to handle events
      aum.startCollecting(done);

      // Use a fake clock
      app1 = new MockApp({ manifest: { type: 'certified' } });
      app2 = new MockApp({ manifest: { type: 'certified' } });
      app3 = new MockApp({ manifest: { type: 'certified' } });
      homescreen = new MockApp({ manifest: { type: 'certified' } });
      lockscreen = new MockApp({ manifest: { type: 'certified' } });
      callscreen = new MockApp({ manifest: { type: 'certified' } });
      attention1 = new MockApp({ manifest: { type: 'certified' } });

      clock = this.sinon.useFakeTimers();
    });

    teardown(function() {
      window.SettingsListener = realSettingsListener;
      window.performance.now = realPerformanceNow;
      installSpy.restore();
      uninstallSpy.restore();
      invocationSpy.restore();
      activitySpy.restore();
      aum.stop();
    });

    function dispatch(type, detail) {
      window.dispatchEvent(new CustomEvent(type, { detail: detail }));
    }

    test('no calls without events', function() {
      assert.equal(installSpy.callCount, 0);
      assert.equal(uninstallSpy.callCount, 0);
      assert.equal(invocationSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
      assert.equal(searchSpy.callCount, 0);
    });

    test('install event', function() {
      dispatch('applicationinstall', { application: app1 });
      assert.equal(installSpy.callCount, 1);
      assert.ok(installSpy.calledWith(app1));
      assert.equal(uninstallSpy.callCount, 0);
      assert.equal(invocationSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
      assert.equal(searchSpy.callCount, 0);
    });

    test('uninstall event', function() {
      dispatch('applicationuninstall', { application: app1 });
      assert.equal(uninstallSpy.callCount, 1);
      assert.ok(uninstallSpy.calledWith(app1));
      assert.equal(installSpy.callCount, 0);
      assert.equal(invocationSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
      assert.equal(searchSpy.callCount, 0);
    });

    test('app transition', function() {
      dispatch('appopened', app1);
      clock.tick(10000);
      dispatch('appopened', app2);
      assert.ok(invocationSpy.lastCall.calledWith(app1, 10000));
      clock.tick(5000);
      dispatch('appopened', app3);
      assert.ok(invocationSpy.lastCall.calledWith(app2, 5000));
      assert.equal(installSpy.callCount, 0);
      assert.equal(uninstallSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
    });

    test('homescreen/app transition', function() {
      dispatch('homescreenopened', homescreen);
      clock.tick(1000);
      dispatch('appopened', app1);
      assert.ok(invocationSpy.lastCall.calledWith(homescreen, 1000));
      clock.tick(1000);
      dispatch('homescreenopened', homescreen);
      assert.ok(invocationSpy.lastCall.calledWith(app1, 1000));
      clock.tick(1000);
      dispatch('appopened', app2);
      assert.ok(invocationSpy.lastCall.calledWith(homescreen, 1000));
      assert.equal(installSpy.callCount, 0);
      assert.equal(uninstallSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
    });

    test('sleep/wake with lockscreen', function() {
      dispatch('homescreenopened', homescreen);
      clock.tick(1000);

      dispatch('lockscreen-appopened', lockscreen);
      assert.ok(invocationSpy.lastCall.calledWith(homescreen, 1000));

      clock.tick(1);
      dispatch('screenchange', { screenEnabled: false });
      assert.ok(invocationSpy.lastCall.calledWith(lockscreen, 1));

      clock.tick(100000);

      // Wake up, but remain locked, then sleep again
      dispatch('screenchange', { screenEnabled: true });
      clock.tick(60000);
      dispatch('screenchange', { screenEnabled: false });
      assert.ok(invocationSpy.lastCall.calledWith(lockscreen, 60000));
      clock.tick(100000);

      // Wake up, then unlock
      dispatch('screenchange', { screenEnabled: true });
      clock.tick(2000);
      dispatch('lockscreen-appclosed', lockscreen);
      assert.ok(invocationSpy.lastCall.calledWith(lockscreen, 2000));

      // Launch an app, then go back to sleep
      clock.tick(1000);
      dispatch('appopened', app1);
      assert.ok(invocationSpy.lastCall.calledWith(homescreen, 1000));
      clock.tick(1000);
      dispatch('lockscreen-appopened', lockscreen);
      assert.ok(invocationSpy.lastCall.calledWith(app1, 1000));
      dispatch('screenchange', { screenEnabled: false });
      assert.ok(invocationSpy.lastCall.calledWith(lockscreen, 0));
      assert.equal(installSpy.callCount, 0);
      assert.equal(uninstallSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
    });

    // If the user disables the lockscreen then we just sleep and wake
    // from whatever app we're using
    test('sleep/wake without lockscreen', function() {
      // Start the homescreen, wait a second and sleep
      dispatch('homescreenopened', homescreen);
      clock.tick(1000);
      dispatch('screenchange', { screenEnabled: false });
      assert.ok(invocationSpy.lastCall.calledWith(homescreen, 1000));

      // Sleep for a long time then wake up
      clock.tick(100000);
      dispatch('screenchange', { screenEnabled: true });

      // Wait a second and launch an app. We should record the second
      // of awake time on the homescreen
      clock.tick(1000);
      dispatch('appopened', app1);
      assert.ok(invocationSpy.lastCall.calledWith(homescreen, 1000));

      // Sleep after a second
      clock.tick(1000);
      dispatch('screenchange', { screenEnabled: false });
      assert.ok(invocationSpy.lastCall.calledWith(app1, 1000));

      // Sleep for a long time then wake up
      clock.tick(100000);
      dispatch('screenchange', { screenEnabled: true });

      // Wait a second and go back to homescreen. We should record the second
      // of awake time on the app
      clock.tick(1000);
      dispatch('homescreenopened', homescreen);
      assert.ok(invocationSpy.lastCall.calledWith(app1, 1000));

      assert.equal(installSpy.callCount, 0);
      assert.equal(uninstallSpy.callCount, 0);
      assert.equal(activitySpy.callCount, 0);
    });

    test('activity invocation', function() {
      // Start on the homescreen, and launch an activity
      dispatch('homescreenopened', homescreen);
      dispatch('activitycreated', { url: 'app1' });
      assert.ok(activitySpy.firstCall.calledWith(homescreen, 'app1'));

      // Launch an app, and then do an activity
      dispatch('appopened', app2);
      dispatch('activitycreated', { url: 'app3' });
      assert.ok(activitySpy.secondCall.calledWith(app2, 'app3'));

      assert.equal(installSpy.callCount, 0);
      assert.equal(uninstallSpy.callCount, 0);
    });

    test('attention windows', function() {
      // Test for multiple attention windows on top of the currently running
      // application
      dispatch('appopened', app1);
      clock.tick(1000);

      dispatch('attentionopened', callscreen);
      assert.ok(invocationSpy.calledWith(app1, 1000));

      clock.tick(2000);
      dispatch('attentionopened', attention1);
      assert.ok(invocationSpy.calledWith(callscreen, 2000));

      clock.tick(3000);
      dispatch('attentionclosed', attention1);
      assert.ok(invocationSpy.calledWith(attention1, 3000));

      clock.tick(4000);
      dispatch('attentionclosed', callscreen);
      assert.ok(invocationSpy.calledWith(callscreen, 4000));

      clock.tick(5000);
      dispatch('homescreenopened', homescreen);
      assert.ok(invocationSpy.calledWith(app1, 5000));
    });

    test('mix tracked and untracked apps', function() {
      var untracked = new MockApp({ manifestURL: 'UNTRACKED' });
      var usage = new AppUsageMetrics.UsageData();
      assert.ok(!usage.shouldTrackApp(untracked));

      // Make sure attention windows are still recorded on top of apps that
      // aren't being tracked
      dispatch('appopened', untracked);
      clock.tick(1000);

      dispatch('attentionopened', callscreen);
      // the untracked app shouldn't have it's invocation recorded when an
      // attention window is opened
      assert.ok(invocationSpy.calledWith(untracked, 1000));
      assert.ok(invocationSpy.returned(false));

      clock.tick(2000);
      dispatch('attentionclosed', callscreen);
      // closing tracked attention window on top of untracked app should be
      // recorded
      assert.ok(invocationSpy.calledWith(callscreen, 2000));
      assert.ok(invocationSpy.returned(true));

      clock.tick(3000);
      dispatch('appopened', app1);
      // switching from untracked->tracked app shouldn't record activity for the
      // untracked app
      assert.ok(invocationSpy.calledWith(untracked, 3000));
      assert.ok(invocationSpy.returned(false));

      clock.tick(4000);
      dispatch('appopened', untracked);
      // switching from tracked->untracked app should record activity for the
      // tracked app
      assert.ok(invocationSpy.calledWith(app1, 4000));
      assert.ok(invocationSpy.returned(true));

      clock.tick(5000);
      dispatch('homescreenopened', homescreen);
      // switching from untracked->home should not record activity for the
      // untracked app
      assert.ok(invocationSpy.calledWith(untracked, 5000));
      assert.ok(invocationSpy.returned(false));
    });

    test('proximity screenchange', function() {
      // Test to make sure proximity sensor based screen changes don't stop
      // collecting metrics for the currently running app / attention window
      dispatch('appopened', app1);
      clock.tick(1000);

      dispatch('attentionopened', callscreen);
      assert.ok(invocationSpy.calledWith(app1, 1000));

      var lastCallCount = invocationSpy.callCount;
      dispatch('screenchange', {
        screenEnabled: false,
        screenOffBy: 'proximity'
      });
      assert.equal(invocationSpy.callCount, lastCallCount);

      clock.tick(2000);
      dispatch('screenchange', {
        screenEnabled: true,
        screenOffBy: 'proximity'
      });
      assert.equal(invocationSpy.callCount, lastCallCount);

      clock.tick(3000);

      dispatch('screenchange', {
        screenEnabled: false,
        screenOffBy: 'lockscreen'
      });
      assert.ok(invocationSpy.calledWith(callscreen, 5000));
      lastCallCount = invocationSpy.callCount;

      clock.tick(4000);
      dispatch('screenchange', {
        screenEnabled: true,
        screenOffBy: 'lockscreen'
      });
      assert.equal(invocationSpy.callCount, lastCallCount);
    });

    test('search request', function() {
      dispatch('iac-app-metrics', {
        action: 'websearch',
        data: 'provider3'
      });
      assert.ok(searchSpy.calledOnce);
      assert.equal(searchSpy.getCall(0).args[0], 'provider3');
    });
  });

  /*
   * Test that the getSettings() utility function works as expected.
   * This is required for proper configuration of the module and for
   * gathering the settings that are sent along with usage data.
   */
  suite('getSettings():', function() {
    var getSettings;

    suiteSetup(function() {
      AppUsageMetrics.DEBUG = false; // Shut up console output in test logs
      getSettings = AppUsageMetrics.getSettings;

      var mockSettings = MockNavigatorSettings.mSettings;
      mockSettings.x = '1';
      mockSettings.y = '2';
    });

    test('getSettings()', function(done) {
      getSettings({x: '3', y: '4', z: '5'}, function(result) {
        done(assert.deepEqual(result, {x: '1', y: '2', z: '5'}));
      });
    });
  });

  suite('settings', function() {
    var aum, mockSettings;
    setup(function() {
      aum = new AppUsageMetrics();
      mockSettings = MockNavigatorSettings.mSettings;
    });

    test('ftu.pingURL is used as a base URL by default', function(done) {
      mockSettings['ftu.pingURL'] = 'foo://bar';
      aum.startCollecting(function() {
        assert.equal(AppUsageMetrics.REPORT_URL, 'foo://bar');
        done();
      });
    });

    test('reportURL overrides ftu.pingURL', function(done) {
      mockSettings['metrics.appusage.reportURL'] = 'foo://foo';
      aum.startCollecting(function() {
        assert.equal(AppUsageMetrics.REPORT_URL, 'foo://foo');
        done();
      });
    });

    test('other settings', function(done) {
      mockSettings['metrics.appusage.reportInterval'] = 97;
      mockSettings['metrics.appusage.reportTimeout'] = 98;
      mockSettings['metrics.appusage.retryInterval'] = 99;
      aum.startCollecting(function() {
        assert.equal(AppUsageMetrics.REPORT_INTERVAL, 97);
        assert.equal(AppUsageMetrics.REPORT_TIMEOUT, 98);
        assert.equal(AppUsageMetrics.RETRY_INTERVAL, 99);
        done();
      });
    });
  });

  /*
   * Test that toggling the telemetry setting turns metrics on and off.
   * This is critical to ensure that if the user does not opt-in to these
   * metrics then we don't collect them.
   */
  suite('Enable/disable:', function() {
    var mockSettings;
    var aum;
    var startspy, stopspy;
    var realstart, realstop;

    suiteSetup(function() {
      realstart = AppUsageMetrics.prototype.startCollecting;
      realstop = AppUsageMetrics.prototype.stopCollecting;
      AppUsageMetrics.prototype.startCollecting = function() {};
      AppUsageMetrics.prototype.stopCollecting = function() {};
    });

    suiteTeardown(function() {
      AppUsageMetrics.prototype.startCollecting = realstart;
      AppUsageMetrics.prototype.stopCollecting = realstop;
    });

    setup(function() {
      mockSettings = MockNavigatorSettings.mSettings;
      startspy = this.sinon.spy(AppUsageMetrics.prototype, 'startCollecting');
      stopspy = this.sinon.spy(AppUsageMetrics.prototype, 'stopCollecting');
      aum = new AppUsageMetrics();  // Will call start in the tests
    });

    teardown(function() {
      aum.stop();
    });

    test('starts immediately if enabled', function(done) {
      mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = true;
      aum.start();
      setTimeout(function() {
        assert.equal(stopspy.callCount, 0);
        done(assert.ok(startspy.calledOnce));
      });
    });

    test('does not start if not enabled', function(done) {
      mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = false;
      aum.start();
      setTimeout(function() {
        assert.ok(stopspy.calledOnce);
        done(assert.equal(startspy.callCount, 0));
      });
    });

    test('starts when enabled', function(done) {
      mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = false;
      aum.start();
      setTimeout(function() {
        assert.equal(startspy.callCount, 0);
        assert.equal(stopspy.callCount, 1);

        mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = true;
        MockNavigatorSettings.mTriggerObservers(
          AppUsageMetrics.TELEMETRY_ENABLED_KEY, { settingValue: true });

        assert.equal(startspy.callCount, 1);

        mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = false;
        MockNavigatorSettings.mTriggerObservers(
          AppUsageMetrics.TELEMETRY_ENABLED_KEY, { settingValue: false });

        done(assert.equal(stopspy.callCount, 2));
      });
    });

    test('stops when disabled and starts again', function(done) {
      mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = true;
      aum.start();
      setTimeout(function() {
        assert.equal(stopspy.callCount, 0);
        assert.ok(startspy.calledOnce);

        mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = false;
        MockNavigatorSettings.mTriggerObservers(
          AppUsageMetrics.TELEMETRY_ENABLED_KEY, { settingValue: false });

        assert.equal(stopspy.callCount, 1);

        mockSettings[AppUsageMetrics.TELEMETRY_ENABLED_KEY] = true;
        MockNavigatorSettings.mTriggerObservers(
          AppUsageMetrics.TELEMETRY_ENABLED_KEY, { settingValue: true });

        done(assert.ok(startspy.calledTwice));
      });
    });
  });

  /*
   * Test that we properly transmit the metrics we've collected.
   */
  suite('Metrics transmission', function() {
    var aum, clock, XHR, xhr, transmit, mockSettings;
    var app1, homescreen;

    setup(function(done) {
      // Use fakes
      clock = this.sinon.useFakeTimers();
      XHR = sinon.useFakeXMLHttpRequest();
      XHR.onCreate = function(instance) { xhr = instance; };

      mockSettings = MockNavigatorSettings.mSettings;

      // Create an AUM instance
      aum = new AppUsageMetrics();
      aum.start();
      aum.startCollecting(done);

      transmit = this.sinon.spy(AppUsageMetrics.prototype, 'transmit');

      app1 = new MockApp({ manifest: { type: 'certified' } });
      homescreen = new MockApp({ manifest: { type: 'certified' } });
      aum.idle = true;
      isOnLine = true;
      clock.tick(); // to make the start call complete
    });

    teardown(function() {
      XHR.restore();
      aum.stop();
    });

    function dispatch(type, detail) {
      window.dispatchEvent(new CustomEvent(type, { detail: detail }));
    }

    test('Transmit after the report interval', function() {
      // Record some data
      aum.metrics.recordInvocation(app1, 10000);

      // Exceed the reporting interval
      clock.tick(AppUsageMetrics.REPORT_INTERVAL + 1);

      // Send an event
      dispatch('homescreenopened', homescreen);

      // Make sure we transmitted
      assert.equal(transmit.callCount, 1);
    });

    test('Don\'t transmit before the interval', function() {
      // Record some data
      aum.metrics.recordInvocation(app1, 10000);

      // Don't exceed the reporting interval
      clock.tick(AppUsageMetrics.REPORT_INTERVAL - 1);

      // Send an event
      dispatch('homescreenopened', homescreen);

      // Make sure we did not transmit
      assert.equal(transmit.callCount, 0);
    });

    test('Don\'t transmit without data', function() {
      // Exceed the reporting interval
      clock.tick(AppUsageMetrics.REPORT_INTERVAL + 1);

      // Send an event
      dispatch('homescreenopened', homescreen);

      // Make sure we did not transmit
      assert.equal(transmit.callCount, 0);
    });

    test('Don\'t transmit if offline', function() {
      // Record some data
      aum.metrics.recordInvocation(app1, 10000);
      isOnLine = false;
      dispatch('offline');

      // Exceed the reporting interval
      clock.tick(AppUsageMetrics.REPORT_INTERVAL + 1);

      // Send an event
      dispatch('homescreenopened', homescreen);

      // Make sure we did not transmit
      assert.equal(transmit.callCount, 0);
    });

    test('Don\'t transmit if not idle', function() {
      // Record some data
      aum.metrics.recordInvocation(app1, 10000);

      // Exceed the reporting interval
      clock.tick(AppUsageMetrics.REPORT_INTERVAL + 1);

      aum.idle = false;

      // Send an event
      dispatch('homescreenopened', homescreen);

      // Make sure we did not transmit
      assert.equal(transmit.callCount, 0);
    });

    test('transmit sends correct data', function() {
      // Record some data
      mockSettings['deviceinfo.hardware'] = 'hardware';
      mockSettings['developer.menu.enabled'] = 'true';
      mockSettings['deviceinfo.product_model'] = 'model';

      var metrics = aum.metrics;
      metrics.recordInstall(app1);
      metrics.recordInvocation(app1, 10000);
      metrics.recordUninstall(app1);
      metrics.recordInvocation(homescreen, 10000);
      metrics.recordActivity(homescreen, 'app4');
      metrics.recordSearch('provider1');

      // Transmit the data
      var sendTime = Date.now();
      aum.transmit();
      clock.tick();

      // Make sure an XHR instance was created
      assert.ok(xhr);

      // Check URL and method
      assert.equal(xhr.method, 'POST');

      var baseURL = AppUsageMetrics.REPORT_URL;
      assert.ok(xhr.url.indexOf(baseURL) === 0);

      var path = xhr.url.substring(baseURL.length + 1).split('/');
      assert.equal(path[0], aum.deviceID);
      assert.equal(path[1], AppUsageMetrics.TELEMETRY_REASON);
      assert.equal(path[2], AppUsageMetrics.TELEMETRY_APP_NAME);
      assert.equal(path[3], 'unknown');
      assert.equal(path[4], 'unknown');
      assert.equal(path[5], 'unknown');

      // Make sure that the correct data was sent
      var payload = JSON.parse(xhr.requestBody);
      assert.ok(payload);
      assert.equal(payload.ver, AppUsageMetrics.TELEMETRY_VERSION);

      var info = payload.info;
      assert.deepEqual(info.apps, metrics.data.apps);
      var apps = [app1.manifestURL, homescreen.manifestURL];
      var dayKey = metrics.getDayKey(sendTime);
      apps.forEach(function(app) {
        assert.ok(app in info.apps);

        var keys = Object.keys(info.apps[app]);
        assert.equal(keys.length, 1);
        assert.equal(keys[0], dayKey);
      });

      assert.deepEqual(info.searches, metrics.data.searches);
      assert.property(info.searches, 'provider1');
      assert.equal(info.start, metrics.data.start);
      assert.equal(info.stop, sendTime);
      assert.equal(info.deviceID, aum.deviceID);
      assert.equal(info.locale, navigator.language);
      assert.equal(info.screen.width, screen.width);
      assert.equal(info.screen.height, screen.height);
      assert.equal(info.screen.devicePixelRatio, window.devicePixelRatio);
      assert.equal(info.appBuildID, 'unknown');
      assert.equal(info.appVersion, 'unknown');
      assert.equal(info.appUpdateChannel, 'unknown');

      var deviceInfo = info.deviceinfo;
      assert.equal(deviceInfo['developer.menu.enabled'], 'true');
      assert.equal(deviceInfo['deviceinfo.hardware'], 'hardware');
      assert.equal(deviceInfo['deviceinfo.product_model'], 'model');
      assert.equal(deviceInfo['deviceinfo.os'], 'unknown');
      assert.equal(deviceInfo['deviceinfo.software'], 'unknown');

      // Make sure we're recording a new batch of metrics
      assert.notEqual(metrics, aum.metrics);
    });

    test('retransmit after failed transmission', function() {
      var metrics = aum.metrics;

      // Record some data
      metrics.recordInstall(app1);
      metrics.recordSearch('provider1');

      // start a transmission
      aum.transmit();
      clock.tick(1);

      // Make sure we've started a new batch of metrics
      assert.notEqual(metrics, aum.metrics);

      clock.tick(1);

      // make the transmission fail
      xhr.onerror(new CustomEvent('error'));

      // Make sure we recorded the failure time
      assert.equal(aum.lastFailedTransmission, Date.now());

      // Make sure we've restored the manifestURLal metrics
      assert.equal(metrics, aum.metrics);

      // We've called transmit once
      assert.equal(transmit.callCount, 1);

      // Increment the time by the retry amount
      clock.tick(AppUsageMetrics.RETRY_INTERVAL + 1);

      // Send an event
      dispatch('homescreenopened', homescreen);

      // And now we should have called transmit again
      assert.equal(transmit.callCount, 2);
    });

    test('retransmit after a timeout', function() {
      var metrics = aum.metrics;

      // Record some data
      metrics.recordInstall(app1);
      metrics.recordSearch('provider1');

      // start a transmission
      aum.transmit();
      clock.tick(1);

      // make the transmission fail
      xhr.ontimeout(new CustomEvent('timeout'));

      // Increment the time by almost enough
      clock.tick(AppUsageMetrics.RETRY_INTERVAL);

      // Send an event
      dispatch('homescreenopened', homescreen);

      // Haven't retried yet
      assert.equal(transmit.callCount, 1);

      // Increment the time by almost enough
      clock.tick(1);

      // Send an event
      dispatch('appopened', app1);

      // Now we've retried
      assert.equal(transmit.callCount, 2);
    });
  });
});
