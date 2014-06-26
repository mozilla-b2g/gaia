'use strict';

/* global MockNavigatorSettings, MockasyncStorage, MockXMLHttpRequest,
          Metrics */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
require('/apps/homescreen/test/unit/mock_xmlhttprequest.js');

require('/apps/system/js/metrics.js');

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

if (!window.XMLHttpRequest) {
  window.XMLHttpRequest = null;
}

suite('Metrics', function() {
  var realMozSettings, realAsyncStorage, realXHR;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realAsyncStorage = window.asyncStorage;
    realXHR = window.XMLHttpRequest;

    navigator.mozSettings = MockNavigatorSettings;
    window.asyncStorage = MockasyncStorage;
    window.XMLHttpRequest = MockXMLHttpRequest;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.asyncStorage = realAsyncStorage;
    window.XMLHttpRequest = realXHR;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockasyncStorage.mTeardown();
    MockXMLHttpRequest.mTeardown();
    Metrics.reset();
    Metrics.resetData();
  });

  suite('isEnabled', function() {
    test('disabled by default (opt-in)', function() {
      assert.ok(!Metrics.isEnabled());
    });
  });

  suite('startService', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['metrics.enabled'] = true;
    });

    test('calls callback', function(done) {
      this.timeout(3000);
      Metrics.startService(function() {
        assert.ok(Metrics.isRunning());
        done();
      });
    });

    test('restores data', function(done) {
      this.timeout(3000);
      MockasyncStorage.mItems['metrics.data'] = '{"foo":"bar"}';
      Metrics.startService(function() {
        assert.equal(Metrics.getData().foo, 'bar');
        done();
      });
    });

    test('gets settings', function(done) {
      this.timeout(3000);
      MockNavigatorSettings.mSettings['metrics.interval'] = 1001;
      MockNavigatorSettings.mSettings['metrics.retryInterval'] = 1002;
      MockNavigatorSettings.mSettings['metrics.retryInterval'] = 1002;
      MockNavigatorSettings.mSettings['metrics.url'] = '_url_';
      Metrics.startService(function() {
        assert.equal(Metrics.getInterval(), 1001);
        assert.equal(Metrics.getRetryInterval(), 1002);
        assert.equal(Metrics.getUrl(), '_url_');
        done();
      });
    });

    test('disabling metrics stops service', function(done) {
      this.timeout(3000);
      Metrics.startService(function() {
        assert.ok(Metrics.isRunning(), 'not running after start service');
        var lock = MockNavigatorSettings.createLock();
        var req = lock.set({ 'metrics.enabled': false });
        req.onsuccess = function() {
          assert.ok(!Metrics.isRunning(), 'still running in onsuccess');
          done();
        };
      });
    });
  });

  suite('stopService', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['metrics.enabled'] = true;
    });

    test('stops after started', function(done) {
      this.timeout(3000);
      Metrics.startService(function() {
        assert.ok(Metrics.isRunning(), 'not running after service start');
        Metrics.stopService();
        assert.ok(!Metrics.isRunning(), 'service is still running');
        done();
      });
    });
  });

  suite('appOpening', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['metrics.enabled'] = true;
      this.clock = sinon.useFakeTimers(1, 'setTimeout', 'clearTimeout',
                                          'setInterval', 'clearInterval',
                                          'Date');
    });

    teardown(function() {
      this.clock.restore();
    });

    test('saves and persists data', function() {
      Metrics.appOpening('org.foo');
      this.clock.tick(1);

      var data = Metrics.getData();
      assert.equal(data.appUsage['org.foo'].launchTime, 1);
      assert.equal(data.appUsage['org.foo'].totalTime, 0);

      var savedData = JSON.parse(MockasyncStorage.mItems['metrics.data']);
      assert.equal(savedData.appUsage['org.foo'].launchTime, 1);
      assert.equal(savedData.appUsage['org.foo'].totalTime, 0);
    });

    test('updates timestamps', function() {
      Metrics.appOpening('org.foo');
      this.clock.tick(1);

      var data = Metrics.getData();
      assert.equal(data.startTimestamp, 1);
      assert.equal(data.startTimestamp, data.stopTimestamp);
    });
  });

  suite('appClosing', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['metrics.enabled'] = true;
      this.clock = sinon.useFakeTimers(1, 'setTimeout', 'clearTimeout',
                                          'setInterval', 'clearInterval',
                                          'Date');
    });

    teardown(function() {
      this.clock.restore();
    });

    test('updates totalTime when app is open', function() {
      Metrics.appOpening('org.foo');
      this.clock.tick(1);

      var data = Metrics.getData();
      assert.equal(data.startTimestamp, 1);
      assert.equal(data.stopTimestamp, 1);
      assert.equal(data.appUsage['org.foo'].launchTime, 1);

      this.clock.tick(100);
      Metrics.appClosing('org.foo');
      this.clock.tick(1);

      data = Metrics.getData();
      assert.equal(data.startTimestamp, 1);
      assert.equal(data.stopTimestamp, 102);
      assert.equal(data.appUsage['org.foo'].totalTime, 101);
    });
  });

  suite('tick', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['metrics.enabled'] = true;
      MockNavigatorSettings.mSettings['metrics.interval'] = 100;
      MockNavigatorSettings.mSettings['metrics.retryInterval'] = 10;
      this.clock = sinon.useFakeTimers(1, 'setTimeout', 'clearTimeout',
                                          'setInterval', 'clearInterval',
                                          'Date');
    });

    teardown(function() {
      this.clock.restore();
    });

    test('sends collected data for closed and crashed apps', function(done) {
      this.timeout(3000);
      var self = this;
      Metrics.startService(function() {
        var start = Date.now();
        Metrics.appOpening('org.foo');
        self.clock.tick(10);

        Metrics.appClosing('org.foo');
        self.clock.tick(10);

        Metrics.appOpening('org.foo2');
        self.clock.tick(20);

        var stop = Date.now();
        Metrics.appCrashing('org.foo2');
        self.clock.tick(100);

        assert.ok(MockXMLHttpRequest.mLastSendData);

        var data = JSON.parse(MockXMLHttpRequest.mLastSendData);
        var fooUsage = data.appUsage['org.foo'];
        assert.equal(fooUsage.totalTime, 10);
        assert.equal(fooUsage.openCount, 1);
        assert.equal(fooUsage.closeCount, 1);
        assert.equal(fooUsage.crashCount, 0);

        var foo2Usage = data.appUsage['org.foo2'];
        assert.equal(foo2Usage.totalTime, 20);
        assert.equal(foo2Usage.openCount, 1);
        assert.equal(foo2Usage.closeCount, 0);
        assert.equal(foo2Usage.crashCount, 1);

        assert.equal(data.startTimestamp, start);
        assert.equal(data.stopTimestamp, stop);
        done();
      });
      this.clock.tick(10);
    });

    test('sends collected data for uninstalled apps', function(done) {
      this.timeout(3000);
      var self = this;
      Metrics.startService(function() {
        var start = Date.now();
        Metrics.appUninstalled('org.foo');
        self.clock.tick(10);

        Metrics.appUninstalled('org.foo2');
        self.clock.tick(200);

        assert.ok(MockXMLHttpRequest.mLastSendData);
        var data = JSON.parse(MockXMLHttpRequest.mLastSendData);
        assert.equal(data.appUninstalls.length, 2);

        assert.equal(data.appUninstalls[0].id, 'org.foo');
        assert.equal(data.appUninstalls[0].time, start);

        assert.equal(data.appUninstalls[1].id, 'org.foo2');
        assert.equal(data.appUninstalls[1].time, start + 10);

        assert.equal(Metrics.getData().appUninstalls.length, 0);
        done();
      });
      this.clock.tick(10);
    });
  });
});
