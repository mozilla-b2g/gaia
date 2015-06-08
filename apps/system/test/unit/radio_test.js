/* global BaseModule, MocksHelper, MockNavigatorMozMobileConnections,
          MockNavigatorSettings, MockLazyLoader, MockFtuLauncher,
          Service, MobileConnectionIcon, OperatorIcon, MockL10n */

'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/roaming_icon.js');
requireApp('system/js/signal_icon.js');
requireApp('system/js/operator_icon.js');
requireApp('system/js/mobile_connection_icon.js');
requireApp('system/js/radio.js');
requireApp('system/js/settings_core.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForRadio = new MocksHelper([
  'NavigatorMozMobileConnections',
  'LazyLoader'
]).init();

suite('Radio > ', function() {
  mocksForRadio.attachTestHelpers();
  var radio, settingsCore, realMozSettings, realL10n;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    MockLazyLoader.mLoadRightAway = true;
    this.sinon.spy(MockLazyLoader, 'load');
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    radio = BaseModule.instantiate('Radio',
      {
        mobileConnections: MockNavigatorMozMobileConnections
      });
    radio.start();
  });

  teardown(function() {
    settingsCore.stop();
    radio.stop();
  });

  test('Should lazy load operator icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/operator_icon.js']));
  });

  test('Should ask step ready', function(done) {
    MockLazyLoader.mLoadRightAway = true;
    Service.register('stepReady', MockFtuLauncher);
    Service.request('stepReady', 'test').then(function() {
      assert.isTrue(MockLazyLoader.load.calledWith([
        'js/roaming_icon.js',
        'js/signal_icon.js',
        'js/mobile_connection_icon.js']));
      done();
    });
  });


  test('Should update icon when fallback settings is changed', function() {
    radio.icon = new MobileConnectionIcon(radio);
    this.sinon.stub(radio.icon, 'update');
    MockNavigatorSettings.mTriggerObservers(
      'ril.radio.disabled', { settingValue: true });
    assert.isFalse(radio.settingEnabled);
    assert.isTrue(radio.icon.update.called);
  });

  suite('Update icons on multi-SIM device', function() {
    setup(function() {
      radio._stepReady = true;
      radio.icon = new MobileConnectionIcon(radio);
      radio.operatorIcon = new OperatorIcon(radio);
      this.sinon.stub(radio.icon, 'update');
      this.sinon.stub(radio.operatorIcon, 'update');
      this.sinon.stub(radio.icon, 'updateData');
    });

    test('Should update data once callschanged',
      function() {
        window.dispatchEvent(new CustomEvent('callschanged'));
        assert.isTrue(radio.icon.updateData.called);
      });

    test('voicechange on sim slot 0', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.triggerEventListeners('voicechange');
      assert.isTrue(radio.icon.update.calledWith(0));
      assert.isFalse(radio.operatorIcon.update.called);
    });

    test('voicechange on sim slot 1', function() {
      var conn = MockNavigatorMozMobileConnections[1];
      conn.triggerEventListeners('voicechange');
      assert.isTrue(radio.icon.update.calledWith(1));
      assert.isFalse(radio.operatorIcon.update.called);
    });

    test('datachange on sim slot 0', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.data = {
        type: '3G'
      };
      conn.triggerEventListeners('datachange');
      assert.isTrue(radio.icon.update.calledWith(0));
      assert.isFalse(radio.operatorIcon.update.called);
    });

    test('datachange on sim slot 1', function() {
      var conn = MockNavigatorMozMobileConnections[1];
      conn.data = {
        type: '3G'
      };
      conn.triggerEventListeners('datachange');
      assert.isTrue(radio.icon.update.calledWith(1));
      assert.isFalse(radio.operatorIcon.update.called);
    });
  });

  suite('Update icons on single SIM device', function() {
    var conn1;
    setup(function() {
      conn1 = MockNavigatorMozMobileConnections[1];
      MockNavigatorMozMobileConnections.mRemoveMobileConnection(1);
      radio._mozMobileConnections = null;
      radio._mobileConnections = MockNavigatorMozMobileConnections;
      radio._stepReady = true;
      radio.icon = new MobileConnectionIcon(radio);
      radio.operatorIcon = new OperatorIcon(radio);
      this.sinon.stub(radio.icon, 'update');
      this.sinon.stub(radio.operatorIcon, 'update');
      this.sinon.stub(radio.icon, 'updateData');
    });

    test('Should update data once callschanged',
      function() {
        window.dispatchEvent(new CustomEvent('callschanged'));
        assert.isTrue(radio.icon.updateData.called);
      });

    test('voicechange on sim slot 0', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.triggerEventListeners('voicechange');
      assert.isTrue(radio.icon.update.calledWith(0));
      assert.isTrue(radio.operatorIcon.update.called);
    });

    test('datachange on sim slot 0', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.data = {
        type: '3G'
      };

      conn.triggerEventListeners('datachange');
      assert.isTrue(radio.icon.update.calledWith(0));
      assert.isTrue(radio.operatorIcon.update.called);
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 1);
    });
  });

  suite('AirplaneMode', function() {
    test('Should do nothing if airplaneMode is undefined', function() {
      this.sinon.stub(radio, '_setRadioEnabled');
      this.sinon.stub(radio.service, 'query').returns(undefined);
      radio._start();
      assert.isFalse(radio._setRadioEnabled.called);
    });

    test('Should turn off if airplaneMode is enabled on started', function() {
      this.sinon.stub(radio, '_setRadioEnabled');
      this.sinon.stub(radio.service, 'query').returns(true);
      radio._start();
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[0], false, 0));
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[1], false, 1));
    });

    test('Should turn on if airplaneMode is disabled on started', function() {
      this.sinon.stub(radio, '_setRadioEnabled');
      this.sinon.stub(radio.service, 'query').returns(false);
      radio._start();
      assert.isTrue(radio._setRadioEnabled.calledTwice);
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[0], true, 0));
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[1], true, 1));
    });

    test('Should turn off radio when getting airplanemode-enabled',
      function() {
        this.sinon.stub(radio, '_setRadioEnabled');
        window.dispatchEvent(new CustomEvent('airplanemode-enabled'));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[0], false, 0));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[1], false, 1));
      });

    test('Should turn on radio when getting airplanemode-disabled',
      function() {
        this.sinon.stub(radio, '_setRadioEnabled');
        window.dispatchEvent(new CustomEvent('airplanemode-disabled'));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[0], true, 0));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[1], true, 1));
      });
  });

  suite('internal _doSetRadioEnabled', function() {
    setup(function() {
      radio.enabled = true;
      setConnection(0, 'enabled');
      this.sinon.spy(radio, '_doSetRadioEnabled');
    });

    test('is called', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.triggerEventListeners('radiostatechange');
      sinon.assert.called(radio._doSetRadioEnabled);
    });
  });

  suite('internal _onRadioStateChange', function() {
    setup(function() {
      this.sinon.stub(radio, 'publish');
    });

    test('publishes the current state', function() {
      var mockMobileConnection = { radioState: 'fakeState' };
      radio._onRadioStateChange(mockMobileConnection, 0);
      assert.isTrue(radio.publish.calledWith('statechange', {
        index: 0,
        state: mockMobileConnection.radioState
      }));
    });
  });

  suite('set enabled to true', function() {
    // make conn count back to 1 at first
    suiteSetup(function() {
      MockNavigatorMozMobileConnections.mTeardown();
    });

    suite('but _enabled is true already, do nothing', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.spy(radio, '_setRadioEnabled');
        radio._enabled = true;
        radio.enabled = true;
      });

      test('nothing happend', function() {
        assert.isFalse(radio._setRadioEnabled.called);
      });
    });

    suite('_enabled is false, keep running', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.spy(radio, '_setRadioEnabled');
        radio._enabled = false;
      });

      suite('conn0 is enabling, conn1 is enabling', function() {
        setup(function() {
          setConnection(0, 'enabling');
          setConnection(1, 'enabling');
          radio.enabled = true;
        });

        test('we will cache doSetRadioEnabled for later use', function() {
          var conns = MockNavigatorMozMobileConnections;
          assert.isFunction(
            conns[0].mEventListeners.radiostatechange[0]);
          assert.isFunction(
            conns[1].mEventListeners.radiostatechange[0]);
        });
      });
    });

    suite('conn0 is enabling, conn1 is enabled', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.stub(window, 'dispatchEvent');

        setConnection(0, 'enabling');
        setConnection(1, 'enabled');
        radio._enabled = false;
        radio.enabled = true;
      });

      test('no further steps because setCount is not 2', function() {
        var conns = MockNavigatorMozMobileConnections;

        assert.isFunction(
          conns[0].mEventListeners.radiostatechange[0]);
        assert.isFunction(
          conns[1].mCachedRadioEnabledReq.onsuccess);

        // but because setCount is not 2, we will not
        // execute further steps
        conns[1].mCachedRadioEnabledReq.onsuccess();
        assert.isFalse(window.dispatchEvent.called);
      });
    });

    suite('conn0 is disabled, conn1 is disabled', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        setConnection(0, 'disabled');
        setConnection(1, 'disabled');
        radio.enabled = true;
      });

      test('enabled radio',
        function() {
          var conns = MockNavigatorMozMobileConnections;
          assert.isFunction(
            conns[0].mCachedRadioEnabledReq.onsuccess);
          assert.isFunction(
            conns[1].mCachedRadioEnabledReq.onsuccess);

          // setRadioEnabled operation is done
          conns[0].mCachedRadioEnabledReq.onsuccess();
          conns[1].mCachedRadioEnabledReq.onsuccess();
      });
    });
  });

  function setConnection(connIndex, status) {
    MockNavigatorMozMobileConnections[connIndex].radioState = status;
  }

  suite('data connection', function() {
    function connIndexTests(connIndex) {
      suite('slot: ' + connIndex, function() {
        test('type lte', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'lte'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), '4G');
        });

        // GSM
        test('type hspa+', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'hspa+'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), 'H+');
        });

        test('type hsdpa', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'hsdpa'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), 'H');
        });

        test('type hsupa', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'hsupa'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), 'H');
        });

        test('type hspa', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'hspa'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), 'H');
        });

        test('type umts', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'umts'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), '3G');
        });

        test('type edge', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'edge'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), 'E');
        });

        test('type gprs', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'gprs'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), '2G');
        });

        // CDMA
        test('type 1xrtt', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: '1xrtt'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), '1x');
        });

        test('type is95a', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'is95a'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), '1x');
        });

        test('type is95b', function() {
          MockNavigatorMozMobileConnections[connIndex].data = {
            connected: true,
            type: 'is95b'
          };
          MockNavigatorMozMobileConnections[connIndex]
            .triggerEventListeners('datachange', {});
          assert.equal(radio.getDataConnectionType(connIndex), '1x');
        });

        // CDMA related to calls
        suite('CDMA network types',
          function() {
          test('type ehrpd', function() {
              MockNavigatorMozMobileConnections[connIndex].data = {
                connected: true,
                type: 'ehrpd'
              };
              MockNavigatorMozMobileConnections[connIndex]
                .triggerEventListeners('datachange', {});
              assert.isFalse(radio.isCDMA(connIndex));
          });

          test('type evdo0', function() {
            MockNavigatorMozMobileConnections[connIndex].data = {
              connected: true,
              type: 'evdo0'
            };
            MockNavigatorMozMobileConnections[connIndex]
              .triggerEventListeners('datachange', {});
            assert.isTrue(radio.isCDMA(connIndex));
          });

          test('type evdoa', function() {
            MockNavigatorMozMobileConnections[connIndex].data = {
              connected: true,
              type: 'evdoa'
            };
            MockNavigatorMozMobileConnections[connIndex]
              .triggerEventListeners('datachange', {});
            assert.isTrue(radio.isCDMA(connIndex));
          });

          test('type evdob', function() {
            MockNavigatorMozMobileConnections[connIndex].data = {
              connected: true,
              type: 'evdob'
            };
            MockNavigatorMozMobileConnections[connIndex]
              .triggerEventListeners('datachange', {});
            assert.isTrue(radio.isCDMA(connIndex));
          });

          test('type 1xrtt', function() {
            MockNavigatorMozMobileConnections[connIndex].data = {
              connected: true,
              type: '1xrtt'
            };
            MockNavigatorMozMobileConnections[connIndex]
              .triggerEventListeners('datachange', {});
            assert.isTrue(radio.isCDMA(connIndex));
          });

          test('type is95a', function() {
            MockNavigatorMozMobileConnections[connIndex].data = {
              connected: true,
              type: 'is95a'
            };
            MockNavigatorMozMobileConnections[connIndex]
              .triggerEventListeners('datachange', {});
            assert.isTrue(radio.isCDMA(connIndex));
          });

          test('type is95b', function() {
            MockNavigatorMozMobileConnections[connIndex].data = {
              connected: true,
              type: 'is95b'
            };
            MockNavigatorMozMobileConnections[connIndex]
              .triggerEventListeners('datachange', {});
            assert.isTrue(radio.isCDMA(connIndex));
          });
        });
      });
    }

    for (var i = 0; i < 2; i++) {
      connIndexTests(i);
    }
  });

  suite('Data connection', function() {
    var mobileDataIconTypesOrig = {};

    suiteSetup(function() {
      for (var key in radio.mobileDataIconTypes) {
        mobileDataIconTypesOrig[key] = radio.mobileDataIconTypes[key];
      }
    });

    suiteTeardown(function() {
      for (var key in mobileDataIconTypesOrig) {
        radio.mobileDataIconTypes[key] = mobileDataIconTypesOrig[key];
      }
    });

    setup(function() {
      for (var key in radio.mobileDataIconTypes) {
        radio.mobileDataIconTypes[key] = mobileDataIconTypesOrig[key];
      }
    });

    var testCases = [
      {
        title: 'No setting value >',
        setting: 'operatorResources.data.icon',
        fc: 'iconData',
        inputVal: {
        },
        expectVal: {
          'lte': '4G',
          'ehrpd': '4G',
          'hspa+': 'H+',
          'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H',
          'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev',
          'umts': '3G',
          'edge': 'E',
          'gprs': '2G',
          '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x'
        }
      },
      {
        title: 'Change all values >',
        setting: 'operatorResources.data.icon',
        fc: 'iconData',
        inputVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng',
          'evdo0': 'EvChng', 'evdoa': 'EvChng', 'evdob': 'EvChng',
          'umts': '3GChng',
          'edge': 'EChng',
          'gprs': '2GChng',
          '1xrtt': '1xChng', 'is95a': '1xChng', 'is95b': '1xChng'
        },
        expectVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng',
          'evdo0': 'EvChng', 'evdoa': 'EvChng', 'evdob': 'EvChng',
          'umts': '3GChng',
          'edge': 'EChng',
          'gprs': '2GChng',
          '1xrtt': '1xChng', 'is95a': '1xChng', 'is95b': '1xChng'
        }
      },
      {
        title: 'Change some values >',
        setting: 'operatorResources.data.icon',
        fc: 'iconData',
        inputVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng'
        },
        expectVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng',
          'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev',
          'umts': '3G',
          'edge': 'E',
          'gprs': '2G',
          '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x'
        }
      }
    ];

    testCases.forEach(function(testCase) {
      test(testCase.title, function() {
        MockNavigatorSettings.mTriggerObservers(
          'operatorResources.data.icon', { settingValue: testCase.inputVal });
        assert.deepEqual(radio.mobileDataIconTypes, testCase.expectVal);
      });
    });
  });
});
