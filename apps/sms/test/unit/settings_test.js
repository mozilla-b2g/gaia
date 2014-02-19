/*
  Settings Tests
*/

/*global
   Settings,
   MockNavigatorSettings
*/

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/js/settings.js');


suite('Message App settings Unit-Test', function() {
  var nativeSettings = navigator.mozSettings;
  teardown(function() {
    MockNavigatorSettings.mTeardown();
    navigator.mozSettings = nativeSettings;
    Settings.mmsSizeLimitation = 300 * 1024;
  });

  suite('Init fetches settings', function() {
    suite('Without mozSettings', function() {
      setup(function(done) {
        navigator.mozSettings = null;
        Settings.mmsSizeLimitation = 'whatever is default';
        Settings.mmsServiceId = 'no service ID';

        // using "then" ensures that init returns a resolved promise
        Settings.init().then(done);
      });

      test('Query size limitation without settings', function() {
        assert.equal(Settings.mmsSizeLimitation, 'whatever is default');
      });

      test('Query mmsServiceId without settings', function() {
        assert.equal(Settings.mmsServiceId, 'no service ID');
      });

      test('Settings is ready', function(done) {
        Settings.whenReady().then(done);
      });

      test('Reports no double SIM', function() {
        assert.isFalse(Settings.isDoubleSim());
      });

    });

    suite('With mozSettings', function() {
      function findSettingsReq(key) {
        var locks = navigator.mozSettings.createLock.returnValues;

        var foundLock = locks.find(function(lock) {
          return lock.get.calledWith(key);
        });

        return foundLock ? foundLock.get.firstCall.returnValue : null;
      }

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
        assert.isFalse(Settings.isDoubleSim());
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
        assert.isTrue(Settings.isDoubleSim());
      });

      test('Query mmsServiceId with only one SIM', function() {
        navigator.mozMobileConnections = ['SIM 1'];
        Settings.init();

        sinon.assert.calledOnce(navigator.mozSettings.createLock);
        assert.isNull(findSettingsReq(Settings.MMS_SERVICE_ID_KEY));
        assert.isFalse(Settings.isDoubleSim());
      });

      suite('Ready resolution >', function() {
        setup(function() {
          navigator.mozMobileConnections = ['SIM 1', 'SIM 2'];

          Settings.init();
        });

        suite('Not ready when some setting is missing >', function() {
          // calling "done" twice makes mocha report an error
          test('no setting was retrieved', function(done) {
            Settings.whenReady().then(function() {
              done(new Error('Should not be ready'));
            });

            done();
          });

          test('only the size limitation', function(done) {
            Settings.whenReady().then(function() {
              done(new Error('Should not be ready'));
            });

            var serviceIdReq = findSettingsReq(Settings.MMS_SERVICE_ID_KEY);
            serviceIdReq.result = {
              'ril.mms.defaultServiceId': 0
            };

            serviceIdReq.onsuccess();

            done();
          });


          test('only the service id', function(done) {
            Settings.whenReady().then(function() {
              done(new Error('Should not be ready'));
            });

            var sizeReq = findSettingsReq('dom.mms.operatorSizeLimitation');
            sizeReq.result = {
              'dom.mms.operatorSizeLimitation': 300
            };
            sizeReq.onsuccess();

            done();
          });
        });

        test('Ready when all settings are retrieved', function(done) {
          Settings.init();

          Settings.whenReady().then(done);

          var serviceIdReq = findSettingsReq(Settings.MMS_SERVICE_ID_KEY);

          serviceIdReq.result = {
            'ril.mms.defaultServiceId': 0
          };

          serviceIdReq.onsuccess();

          var sizeReq = findSettingsReq('dom.mms.operatorSizeLimitation');
          sizeReq.result = {
            'dom.mms.operatorSizeLimitation': 300
          };
          sizeReq.onsuccess();
        });
      });

      test('mmsServiceId observer and update', function() {
        navigator.mozMobileConnections = ['SIM 1', 'SIM 2'];
        Settings.init();

        var serviceIdReq = findSettingsReq(Settings.MMS_SERVICE_ID_KEY);

        serviceIdReq.result = {
          'ril.mms.defaultServiceId': 0
        };
        serviceIdReq.onsuccess();

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
