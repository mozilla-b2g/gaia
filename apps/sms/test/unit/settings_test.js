/*
  Settings Tests
*/

/*global
   Settings,
   MockNavigatorSettings,
   MockL10n,
   MocksHelper,
   MobileOperator
*/

'use strict';

require('/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
require('/js/settings.js');

var mocksHelperForSettings = new MocksHelper([
  'MobileOperator'
]).init();

suite('Settings >', function() {
  var nativeSettings;

  mocksHelperForSettings.attachTestHelpers();

  setup(function() {
    nativeSettings = navigator.mozSettings;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    navigator.mozSettings = nativeSettings;
    Settings.mmsSizeLimitation = 300 * 1024;
  });

  test('getSimNameByIccId returns the empty string before init', function() {
    assert.equal('', Settings.getSimNameByIccId('anything'));
  });

  test('getOperatorByIccId returns the empty string before init', function() {
    assert.equal('', Settings.getOperatorByIccId('anything'));
  });

  suite('Without mozSettings', function() {
    setup(function() {
      navigator.mozSettings = null;
      Settings.mmsSizeLimitation = 'whatever is default';
      Settings.mmsServiceId = 'no service ID';
      Settings.smsServiceId = 'no service ID';

      Settings.init();
    });

    test('Query size limitation without settings', function() {
      assert.equal(Settings.mmsSizeLimitation, 'whatever is default');
    });

    test('Query mmsServiceId without settings', function() {
      assert.equal(Settings.mmsServiceId, 'no service ID');
    });

    test('Query smsServiceId without settings', function() {
      assert.equal(Settings.smsServiceId, 'no service ID');
    });

    test('Reports no dual SIM', function() {
      assert.isFalse(Settings.isDualSimDevice());
      assert.isFalse(Settings.hasSeveralSim());
    });

    test('getOperatorByIccId returns the empty string', function() {
      assert.equal('', Settings.getOperatorByIccId('anything'));
    });

    test('getSimNameByIccId returns the empty string', function() {
      assert.equal('', Settings.getSimNameByIccId('anything'));
    });

    test('getServiceIdByIccId returns null', function() {
      assert.isNull(Settings.getServiceIdByIccId('anything'));
    });
  });

  suite('With mozSettings', function() {
    var realMozL10n, realSettings;

    function findSettingsReq(key) {
      var locks = navigator.mozSettings.createLock.returnValues;

      var foundLock = locks.find(function(lock) {
        return lock.get.calledWith(key);
      });

      return foundLock ? foundLock.get.firstCall.returnValue : null;
    }

    function triggerSettingsReqSuccess(setting, value) {
      var req = findSettingsReq(setting);
      req.result = {};
      req.result[setting] = value;
      req.onsuccess();
    }

    function assertSettingIsRetrieved(prop, setting, value) {
      triggerSettingsReqSuccess(setting, value);
      assert.equal(
        Settings[prop], value,
        'The setting ' + setting + ' is equal to ' + value
      );
    }

    setup(function() {
      realMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      realSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      Settings.mmsSizeLimitation = 'whatever is default';
      Settings.mmsServiceId = 'no service ID';

      this.sinon.stub(navigator.mozSettings, 'createLock', function() {
        var api = {
          get: function() {
            return {};
          },
          set: function() {}
        };
        sinon.spy(api, 'get');
        return api;
      });
    });

    teardown(function() {
      navigator.mozL10n = realMozL10n;
      realMozL10n = null;

      navigator.mozSettings = realSettings;
      realSettings = null;
    });

    test('Query size limitation with settings exist(500KB)', function() {
      Settings.init();
      assert.equal(Settings.mmsSizeLimitation, 'whatever is default');

      // only made one call to get settings(non-DSDS case)
      sinon.assert.calledOnce(navigator.mozSettings.createLock);

      assertSettingIsRetrieved(
        'mmsSizeLimitation',
        'dom.mms.operatorSizeLimitation',
        512000
      );
      assert.isFalse(Settings.hasSeveralSim());
    });

    suite('in a dual SIM device with 2 SIMs,', function() {
      setup(function() {
        // TODO use the mocks from shared and update them according to latest
        // spec
        navigator.mozMobileConnections = [
          { iccId: 'SIM 1' },
          { iccId: 'SIM 2' }
        ];
        Settings.init();
      });

      test('init is correctly executed', function() {
        assert.equal(Settings.mmsServiceId, 'no service ID');

        // Three calls for mmsSizeLimitation/mmsServiceId/smsServiceId
        sinon.assert.calledThrice(navigator.mozSettings.createLock);
      });

      test('Dual SIM state is correctly reported', function() {
        assert.isTrue(Settings.hasSeveralSim());
        assert.isTrue(Settings.isDualSimDevice());
      });

      test('the settings are correctly retrieved', function() {
        for (var prop in Settings.SERVICE_ID_KEYS) {
          var setting = Settings.SERVICE_ID_KEYS[prop];
          assertSettingIsRetrieved(prop, setting, 0);
        }
      });

      suite('getOperatorByIccId returns the correct operator', function() {
        setup(function() {
          this.sinon.stub(MobileOperator, 'userFacingInfo').returns({
            operator: 'operator'
          });
        });

        test('iccId does not match any connection', function(){
          assert.equal(Settings.getOperatorByIccId('SIM 3'), '');
          sinon.assert.notCalled(MobileOperator.userFacingInfo);
        });

        test('iccId match one connection', function(){
          assert.equal(Settings.getOperatorByIccId('SIM 1'), 'operator');
          sinon.assert.calledWith(MobileOperator.userFacingInfo,
            navigator.mozMobileConnections[0]);
        });
      });

      test('getSimNameByIccId returns the correct name', function() {
        assert.equal(Settings.getSimNameByIccId('SIM 1'), 'sim-name{"id":1}');
        assert.equal(Settings.getSimNameByIccId('SIM 2'), 'sim-name{"id":2}');
        assert.equal(Settings.getSimNameByIccId('SIM 3'), '');
      });

      test('getServiceIdByIccId returns the correct id', function() {
        assert.equal(Settings.getServiceIdByIccId('SIM 1'), 0);
        assert.equal(Settings.getServiceIdByIccId('SIM 2'), 1);
        assert.isNull(Settings.getServiceIdByIccId('SIM 3'));
      });
    });

    test('in a single SIM device', function() {
      navigator.mozMobileConnections = [{ iccId: 'SIM 1' }];
      Settings.init();

      sinon.assert.calledOnce(navigator.mozSettings.createLock);
      for (var prop in Settings.SERVICE_ID_KEYS) {
        var setting = Settings.SERVICE_ID_KEYS[prop];
        assert.isNull(findSettingsReq(setting));
        assert.equal(Settings[prop], 'no service ID');
      }
      assert.isFalse(Settings.hasSeveralSim());
      assert.isFalse(Settings.isDualSimDevice());
      assert.isNull(Settings.getServiceIdByIccId('SIM 1'));
    });

    test('in a dual SIM device with only 1 SIM', function() {
      navigator.mozMobileConnections = [{ iccId: 'SIM 1' }, { iccId: null }];
      Settings.init();

      sinon.assert.calledThrice(navigator.mozSettings.createLock);
      for (var prop in Settings.SERVICE_ID_KEYS) {
        var setting = Settings.SERVICE_ID_KEYS[prop];
        assert.ok(findSettingsReq(setting));
      }
      assert.isFalse(Settings.hasSeveralSim());
      assert.isTrue(Settings.isDualSimDevice());
      assert.equal(Settings.getServiceIdByIccId('SIM 1'), 0);
    });

    test('in a triple SIM device with 2 SIMs', function() {
      navigator.mozMobileConnections = [
        { iccId: 'SIM 1' },
        { iccId: 'SIM 2' },
        { iccId: null }
      ];
      Settings.init();

      assert.isTrue(Settings.hasSeveralSim());
      assert.isTrue(Settings.isDualSimDevice());
    });

    test('mmsServiceId observer and update', function() {
      navigator.mozMobileConnections = [
        { iccId: 'SIM 1' },
        { iccId: 'SIM 2' }
      ];
      Settings.init();

      for (var prop in Settings.SERVICE_ID_KEYS) {
        var setting = Settings.SERVICE_ID_KEYS[prop];
        triggerSettingsReqSuccess(setting, 0);
        MockNavigatorSettings.mTriggerObservers(setting, {settingValue: 1});
        assert.equal(Settings[prop], 1);
      }
    });

    suite('switchSimHandler for async callback when ready', function() {
      var conn;
      var listenerSpy, switchSimCallback;

      // The real navigator.mozMobileConnections is not a real array
      var mockMozMobileConnections = {
        0: {
          iccId: 'SIM 1',
          addEventListener: function() {},
          removeEventListener: function() {},
          data: {
            state: 'searching'
          }
        },
        1: {
          iccId: 'SIM 2',
          addEventListener: function() {},
          removeEventListener: function() {},
          data: {
            state: 'searching'
          }
        }
      };

      setup(function() {
        if (!('mozMobileConnections' in navigator)) {
          navigator.mozMobileConnections = null;
        }

        // let's use the mock's implementation
        navigator.mozSettings.createLock.restore();

        this.sinon.stub(window.navigator, 'mozMobileConnections',
          mockMozMobileConnections);

        conn = window.navigator.mozMobileConnections[1];
        listenerSpy = this.sinon.spy(conn, 'addEventListener');
        Settings.init();

        switchSimCallback = sinon.stub();
        Settings.switchMmsSimHandler(1, switchSimCallback);
      });

      test('callback should not be triggered if state did not change',
        function() {
        listenerSpy.yield();

        assert.equal(
          MockNavigatorSettings.mSettings['ril.mms.defaultServiceId'], 1
        );
        assert.equal(
          MockNavigatorSettings.mSettings['ril.data.defaultServiceId'], 1
        );
        sinon.assert.notCalled(switchSimCallback);
      });

      test('callback when data connection state changes', function() {
        conn.data.state = 'registered';
        listenerSpy.yield();
        assert.equal(
          MockNavigatorSettings.mSettings['ril.mms.defaultServiceId'], 1
        );
        assert.equal(
          MockNavigatorSettings.mSettings['ril.data.defaultServiceId'], 1
        );
        sinon.assert.calledOnce(switchSimCallback);
      });
    });
  });
});
