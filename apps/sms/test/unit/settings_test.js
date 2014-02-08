/*
  Settings Tests
*/

/*global Settings, MockNavigatorSettings */

'use strict';

requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/js/settings.js');


suite('Message App settings Unit-Test', function() {
  var nativeSettings = navigator.mozSettings;
  teardown(function() {
    navigator.mozSettings = nativeSettings;
    Settings.mmsSizeLimitation = 300 * 1024;
  });

  suite('Init fetches settings', function() {
    suite('Without mozSettings', function() {
      setup(function() {
        navigator.mozSettings = null;
        Settings.mmsSizeLimitation = 'whatever is default';
        Settings.mmsServiceId = 'no service ID';
        Settings.init();
      });

      test('Query size limitation without settings', function() {
        assert.equal(Settings.mmsSizeLimitation, 'whatever is default');
      });

      test('Query mmsServiceId without settings', function() {
        assert.equal(Settings.mmsServiceId, 'no service ID');
      });
    });
    suite('With mozSettings', function() {
      setup(function() {
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

      test('Query size limitation with settings exist(500KB)', function() {
        Settings.init();
        assert.equal(Settings.mmsSizeLimitation, 'whatever is default');

        // only made one call to get settings(non-DSDS case)
        assert.equal(navigator.mozSettings.createLock.returnValues.length, 1);
        var lock = navigator.mozSettings.createLock.returnValues[0];
        assert.equal(lock.get.returnValues.length, 1);

        var req = lock.get.returnValues[0];
        req.result = {
          'dom.mms.operatorSizeLimitation': 512000
        };
        req.onsuccess();

        assert.equal(Settings.mmsSizeLimitation, 500 * 1024);
      });

      test('Query mmsServiceId with settings exist(ID=0)', function() {
        navigator.mozMobileConnections = ['SIM 1', 'SIM 2'];
        Settings.init();
        assert.equal(Settings.mmsServiceId, 'no service ID');

        // Two calls for mmsSizeLimitation/mmsServiceId
        assert.equal(navigator.mozSettings.createLock.returnValues.length, 2);
        var lock = navigator.mozSettings.createLock.returnValues[1];
        assert.equal(lock.get.returnValues.length, 1);

        var req = lock.get.returnValues[0];
        req.result = {
          'ril.mms.defaultServiceId': 0
        };
        req.onsuccess();

        assert.equal(Settings.mmsServiceId, 0);
      });

      test('mmsServiceId observer and update', function() {
        MockNavigatorSettings.mTriggerObservers('ril.mms.defaultServiceId',
                                                {settingValue: 1});
        assert.equal(Settings.mmsServiceId, 1);
      });

      suite('switchSimHandler for async callback when ready', function() {
        var conn;
        var listenerSpy;
        var mockMozMobileConnections = {
          1: {
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

          this.sinon.stub(window.navigator, 'mozMobileConnections',
            mockMozMobileConnections);
          this.sinon.spy(Settings, 'setSimServiceId');
          conn = window.navigator.mozMobileConnections[1];
          listenerSpy = this.sinon.spy(conn, 'addEventListener');
        });

        test('callback should not be triggered if state did not change',
          function() {
          var stub = sinon.stub();
          Settings.switchSimHandler(1, stub);
          listenerSpy.yield();
          sinon.assert.calledWith(Settings.setSimServiceId, 1);
          sinon.assert.notCalled(stub);
        });

        test('callback when data connection state changes', function() {
          var stub = sinon.stub();
          Settings.switchSimHandler(1, stub);
          conn.data.state = 'registered';
          listenerSpy.yield();
          sinon.assert.calledWith(Settings.setSimServiceId, 1);
          sinon.assert.calledOnce(stub);
        });
      });
    });
  });
});
