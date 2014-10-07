'use strict';

/* global MockNavigatorSettings, MockasyncStorage, MockXMLHttpRequest,
          MockNavigatorMozMobileConnections, MockNavigatorMozIccManager,
          MockMobileOperator, MockSIMSlotManager, MockSIMSlot */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
require('/apps/homescreen/test/unit/mock_xmlhttprequest.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');

require('/shared/js/uuid.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_simslot.js');
require('/apps/system/js/ftu_ping.js');

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

if (!window.MobileOperator) {
  window.MobileOperator = null;
}

if (!window.XMLHttpRequest) {
  window.XMLHttpRequest = null;
}

if (!window.SIMSlotManager) {
  window.SIMSlotManager = null;
}

suite('FtuPing', function() {
  var realMozSettings, realAsyncStorage, realXHR;
  var realMobileConnections, realIccManager;
  var realMobileOperator, realSIMSlotManager;
  var FtuPing;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realAsyncStorage = window.asyncStorage;
    realXHR = window.XMLHttpRequest;
    realMobileConnections = navigator.mozMobileConnections;
    realIccManager = navigator.mozIccManager;
    realMobileOperator = window.MobileOperator;
    realSIMSlotManager = window.SIMSlotManager;

    navigator.mozSettings = MockNavigatorSettings;
    window.asyncStorage = MockasyncStorage;
    window.XMLHttpRequest = MockXMLHttpRequest;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    window.MobileOperator = MockMobileOperator;
    window.SIMSlotManager = MockSIMSlotManager;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.asyncStorage = realAsyncStorage;
    window.XMLHttpRequest = realXHR;
    navigator.mozMobileConnections = realMobileConnections;
    navigator.mozIccManager = realIccManager;
    window.MobileOperator = realMobileOperator;
    window.SIMSlotManager = realSIMSlotManager;
  });

  setup(function() {
    FtuPing = new window.FtuPing();
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockasyncStorage.mTeardown();
    MockXMLHttpRequest.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
    MockMobileOperator.mTeardown();
    MockSIMSlotManager.mTeardown();
    FtuPing = null;
  });

  suite('generatePingURL', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['ftu.pingURL'] = 'test_url';
      MockasyncStorage.mItems['ftu.pingID'] = 'test_id';
    });

    test('returns expected url', function(done) {
      var mockSettings = MockNavigatorSettings.mSettings;
      mockSettings['deviceinfo.platform_version'] = 'test_version';
      mockSettings['app.update.channel'] = 'test_channel';
      mockSettings['deviceinfo.platform_build_id'] = 'test_build_id';

      FtuPing.initSettings(function() {
        var url = FtuPing.generatePingURL();
        assert.equal(url, 'test_url/test_id/ftu/FirefoxOS/test_version/' +
                          'test_channel/test_build_id');
        done();
      });
    });

    test('returns unknown for empty properties', function(done) {
      FtuPing.initSettings(function() {
        var url = FtuPing.generatePingURL();
        assert.equal(url, 'test_url/test_id/ftu/FirefoxOS/unknown/unknown/' +
                          'unknown');
        done();
      });
    });

    test('encodes URI parameters', function(done) {
      var mockSettings = MockNavigatorSettings.mSettings;
      mockSettings['deviceinfo.platform_version'] = 'i have/';
      mockSettings['app.update.channel'] = 'lots of:';
      mockSettings['deviceinfo.platform_build_id'] = 'spaces man?';
      FtuPing.initSettings(function() {
        var url = FtuPing.generatePingURL();
        assert.equal(url, 'test_url/test_id/ftu/FirefoxOS/i%20have%2F/' +
                          'lots%20of%3A/spaces%20man%3F');
        done();
      });
    });
  });

  test('getAsyncStorageItems gets all items', function(done) {
    this.timeout(5000);
    MockasyncStorage.mItems.a = 1;
    MockasyncStorage.mItems.b = 2;
    MockasyncStorage.mItems.c = 3;
    FtuPing.getAsyncStorageItems(['a', 'b', 'c'], function(items) {
      assert.equal(items.a, 1);
      assert.equal(items.b, 2);
      assert.equal(items.c, 3);
      done();
    });
  });

  test('getSettings gets all settings', function(done) {
    this.timeout(5000);
    MockNavigatorSettings.mSettings.a = 1;
    MockNavigatorSettings.mSettings.b = 2;
    MockNavigatorSettings.mSettings.c = 3;
    FtuPing.getSettings(['a', 'b', 'c'], function(settings) {
      assert.equal(settings.a, 1);
      assert.equal(settings.b, 2);
      assert.equal(settings.c, 3);
      done();
    });
  });

  suite('ensurePing', function() {
    var realStartPing;
    var doneCallback;

    setup(function() {
      realStartPing = FtuPing.startPing;
      FtuPing.startPing = function() {
        if (doneCallback) {
          doneCallback();
        }
      };
      MockNavigatorSettings.mSettings['ftu.pingURL'] = 'test_url';
    });

    teardown(function() {
      FtuPing.startPing = realStartPing;
      doneCallback = null;
    });

    test('window properties are set', function(done) {
      this.timeout(3000);
      doneCallback = function() {
        var pingData = FtuPing.getPingData();
        assert.equal(pingData.screenHeight, window.screen.height);
        assert.equal(pingData.screenWidth, window.screen.width);
        assert.equal(pingData.devicePixelRatio, window.devicePixelRatio);
        assert.equal(pingData.locale, navigator.language);
        done();
      };
      FtuPing.ensurePing();
    });

    test('empty settings are generated', function(done) {
      this.timeout(3000);
      doneCallback = function() {
        var pingData = FtuPing.getPingData();
        assert.equal(pingData.ver, 3);
        assert.ok(pingData.pingID);
        assert.equal(pingData.pingID, MockasyncStorage.mItems['ftu.pingID']);

        assert.ok(pingData.activationTime);
        assert.equal(pingData.activationTime,
                     MockasyncStorage.mItems['ftu.pingActivation']);

        assert.ok(FtuPing.isEnabled());
        assert.equal(FtuPing.getNetworkFailCount(), 0);

        assert.equal(FtuPing.getTryInterval(), 60 * 60 * 1000);
        assert.equal(FtuPing.getPingTimeout(), 60 * 1000);
        assert.equal(FtuPing.getMaxNetworkFails(), 24);
        done();
      };
      FtuPing.ensurePing();
    });

    test('existing settings are set', function(done) {
      this.timeout(3000);
      MockasyncStorage.mItems['ftu.pingID'] = 'test_ping_id';
      MockasyncStorage.mItems['ftu.pingActivation'] = 'test_activation';
      MockasyncStorage.mItems['ftu.pingEnabled'] = false;
      MockasyncStorage.mItems['ftu.pingNetworkFailCount'] = 10;

      var mockSettings = MockNavigatorSettings.mSettings;
      mockSettings['ftu.pingTryInterval'] = 10000;
      mockSettings['ftu.pingTimeout'] = 1000;
      mockSettings['ftu.pingMaxNetworkFails'] = 100;
      mockSettings['deviceinfo.os'] = 'test_os';
      mockSettings['deviceinfo.software'] = 'test_software';
      mockSettings['deviceinfo.platform_build_id'] = 'test_build_id';
      mockSettings['deviceinfo.platform_version'] = 'test_version';
      mockSettings['deviceinfo.product_model'] = 'test_model';
      mockSettings['deviceinfo.firmware_revision'] = 'test_revision';
      mockSettings['deviceinfo.hardware'] = 'test_hardware';
      mockSettings['app.update.channel'] = 'test_channel';

      doneCallback = function() {
        var pingData = FtuPing.getPingData();
        assert.equal(pingData.pingID, 'test_ping_id');
        assert.equal(pingData.activationTime, 'test_activation');
        assert.equal(FtuPing.isEnabled(), false);
        assert.equal(FtuPing.getNetworkFailCount(), 10);
        assert.equal(FtuPing.getPingURL(), 'test_url');
        assert.equal(FtuPing.getTryInterval(), 10000);
        assert.equal(FtuPing.getPingTimeout(), 1000);
        assert.equal(FtuPing.getMaxNetworkFails(), 100);

        assert.equal(pingData['deviceinfo.os'], 'test_os');
        assert.equal(pingData['deviceinfo.software'], 'test_software');
        assert.equal(pingData['deviceinfo.platform_build_id'], 'test_build_id');
        assert.equal(pingData['deviceinfo.platform_version'], 'test_version');
        assert.equal(pingData['deviceinfo.product_model'], 'test_model');
        assert.equal(pingData['deviceinfo.firmware_revision'], 'test_revision');
        assert.equal(pingData['deviceinfo.hardware'], 'test_hardware');
        assert.equal(pingData['app.update.channel'], 'test_channel');
        done();
      };
      FtuPing.ensurePing();
    });

    test('startPing is called from ensurePing', function(done) {
      this.timeout(3000);
      doneCallback = done;
      FtuPing.ensurePing();
    });
  });

  function addMockMobileConnection() {
    MockNavigatorMozMobileConnections.mAddMobileConnection();

    var mockConn = MockNavigatorMozMobileConnections[0];
    mockConn.iccId = 'test_icc';
    mockConn.voice = {
      network: {
        mnc: 'voice_mnc',
        mcc: 'voice_mcc'
      }
    };

    var mockIcc = {
      iccInfo: {
        mnc: 'icc_mnc',
        mcc: 'icc_mcc',
        spn: 'icc_spn'
      }
    };

    MockNavigatorMozIccManager.addIcc('test_icc', mockIcc);
    MockMobileOperator.mOperator = 'test_operator';
    MockMobileOperator.mCarrier = 'test_carrier';
    MockMobileOperator.mRegion = 'test_region';
    return mockConn;
  }

  suite('checkMobileNetwork', function() {
    test('fails with no sim card connected to network', function() {
        this.sinon.stub(MockSIMSlotManager, 'noSIMCardConnectedToNetwork')
            .returns(true);
        assert.throw(function() { FtuPing.checkMobileNetwork(); },
                     /No SIM cards/);
        assert.equal(FtuPing.getNetworkFailCount(), 1);
        MockSIMSlotManager.noSIMCardConnectedToNetwork.restore();
    });

    test('fails with no mobile connections', function() {
      this.sinon.stub(MockSIMSlotManager, 'noSIMCardConnectedToNetwork')
          .returns(false);
      assert.throw(function() { FtuPing.checkMobileNetwork(); },
                   /No mobile connections/);
      assert.equal(FtuPing.getNetworkFailCount(), 1);
      MockSIMSlotManager.noSIMCardConnectedToNetwork.restore();
    });

    test('fails with no SIM slots', function() {
      this.sinon.stub(MockSIMSlotManager, 'noSIMCardConnectedToNetwork')
          .returns(false);
      MockNavigatorMozMobileConnections.mAddMobileConnection();
      assert.throw(function() { FtuPing.checkMobileNetwork(); },
                   /No mobile connections/);
      MockSIMSlotManager.noSIMCardConnectedToNetwork.restore();
    });

    suite('dual SIM', function() {
      var slot1, slot2, conn;
      setup(function() {
        this.sinon.stub(MockSIMSlotManager, 'noSIMCardConnectedToNetwork')
            .returns(false);
        conn = addMockMobileConnection();

        slot1 = new MockSIMSlot(conn, 0), slot2 = new MockSIMSlot(conn, 1);
        MockSIMSlotManager.mInstances.push(slot1);
        MockSIMSlotManager.mInstances.push(slot2);
      });

      teardown(function() {
        MockSIMSlotManager.noSIMCardConnectedToNetwork.restore();
      });

      test('fails when both absent', function() {
        slot1.absent = true;
        slot2.absent = true;
        assert.throw(function() { FtuPing.checkMobileNetwork(); },
                     /No unlocked or active/);
      });

      test('fails when only slot 2 is active but locked', function() {
        slot1.absent = true;
        slot2.locked = true;
        assert.throw(function() { FtuPing.checkMobileNetwork(); },
                     /No unlocked or active/);
      });

      test('succeeds with only slot 1 active and unlocked', function() {
        slot2.absent = true;
        assert.doesNotThrow(function() { FtuPing.checkMobileNetwork(); });
      });

      test('succeeds with only slot 2 active and unlocked', function() {
        slot1.absent = true;
        assert.doesNotThrow(function() { FtuPing.checkMobileNetwork(); });
      });
    });

    test('max mobile failures pings anyway', function(done) {
      MockasyncStorage.mItems['ftu.pingNetworkFailCount'] = 1;
      MockNavigatorSettings.mSettings['ftu.pingMaxNetworkFails'] = 1;
      MockNavigatorSettings.mSettings['deviceinfo.os'] = 'test_os';

      FtuPing.initSettings(function() {
        assert.doesNotThrow(function() { FtuPing.checkMobileNetwork(); });

        var pingData = FtuPing.getPingData();
        assert.ok(!pingData.network);
        assert.ok(!pingData.icc);
        done();
      });
    });

  });

  suite('tryPing', function() {
    var realPing, pingCallback;
    setup(function() {
      realPing = FtuPing.ping;
      FtuPing.ping = function() {
        if (pingCallback) {
          pingCallback();
        }
      };
    });

    teardown(function() {
      FtuPing.ping = realPing;
      pingCallback = null;
    });

    test('no deviceinfo.os fails', function(done) {
      MockasyncStorage.mItems['ftu.pingNetworkFailCount'] = 1;
      MockNavigatorSettings.mSettings['ftu.pingMaxNetworkFails'] = 1;
      FtuPing.initSettings(function() {
        assert.ok(!FtuPing.tryPing());
        done();
      });
    });

    test('iccinfo and voice network make it into pingData', function(done) {
      MockNavigatorSettings.mSettings['deviceinfo.os'] = 'test_os';
      this.sinon.stub(MockSIMSlotManager, 'noSIMCardConnectedToNetwork')
          .returns(false);
      var conn = addMockMobileConnection();
      MockSIMSlotManager.mInstances.push(new MockSIMSlot(conn, 0));

      FtuPing.initSettings(function() {
        assert.ok(FtuPing.tryPing());

        var pingData = FtuPing.getPingData();
        assert.ok(pingData.icc);
        assert.equal(pingData.icc.mnc, 'icc_mnc');
        assert.equal(pingData.icc.mcc, 'icc_mcc');
        assert.equal(pingData.icc.spn, 'icc_spn');

        assert.ok(pingData.network);
        assert.equal(pingData.network.mnc, 'voice_mnc');
        assert.equal(pingData.network.mcc, 'voice_mcc');
        assert.equal(pingData.network.operator, 'test_operator');
        assert.equal(pingData.network.carrier, 'test_carrier');
        assert.equal(pingData.network.region, 'test_region');
        MockSIMSlotManager.noSIMCardConnectedToNetwork.restore();
        done();
      });
    });
  });

  suite('ping', function() {
    setup(function() {
      MockNavigatorSettings.mSettings['ftu.pingURL'] = 'test_url';
      MockasyncStorage.mItems['ftu.pingEnabled'] = true;
      MockasyncStorage.mItems['ftu.pingID'] = 'test_id';
    });

    test('pingData and url are valid', function(done) {
      MockNavigatorSettings.mSettings['deviceinfo.os'] = 'test_os';

      FtuPing.initSettings(function() {
        FtuPing.ping();
        assert.equal(MockXMLHttpRequest.mLastOpenedUrl,
                     'test_url/test_id/ftu/FirefoxOS/unknown/unknown/unknown');
        assert.equal(MockXMLHttpRequest.mHeaders['Content-type'],
                     'application/json');

        var data = JSON.parse(MockXMLHttpRequest.mLastSendData);
        assert.equal(data['deviceinfo.os'], 'test_os');
        done();
      });
    });

    test('OK clears enabled flag', function(done) {
      FtuPing.initSettings(function() {
        FtuPing.ping();
        MockXMLHttpRequest.mSendOnLoad({ responseText: 'OK' });
        assert.equal(MockasyncStorage.mItems['ftu.pingEnabled'], false);
        assert.equal(FtuPing.isEnabled(), false);
        done();
      });
    });

    test('bad response doesn\'t clear flag', function(done) {
      FtuPing.initSettings(function() {
        FtuPing.ping();
        MockXMLHttpRequest.mSendOnLoad({ responseText: 'bla' });
        assert.equal(MockasyncStorage.mItems['ftu.pingEnabled'], true);
        assert.equal(FtuPing.isEnabled(), true);
        done();
      });
    });

    test('error doesn\'t clear flag', function(done) {
      FtuPing.initSettings(function() {
        FtuPing.ping();
        MockXMLHttpRequest.mSendError();
        assert.equal(MockasyncStorage.mItems['ftu.pingEnabled'], true);
        assert.equal(FtuPing.isEnabled(), true);
        done();
      });
    });

    test('timeout doesn\'t clear flag', function(done) {
      FtuPing.initSettings(function() {
        FtuPing.ping();
        MockXMLHttpRequest.mSendTimeout();
        assert.equal(MockasyncStorage.mItems['ftu.pingEnabled'], true);
        assert.equal(FtuPing.isEnabled(), true);
        done();
      });
    });
  });
});
