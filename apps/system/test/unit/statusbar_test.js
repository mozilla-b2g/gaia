'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_simslot.js');
requireApp('system/test/unit/mock_simslot_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_touch_forwarder.js');
requireApp('system/js/lockscreen.js');

var mocksForStatusBar = new MocksHelper([
  'SettingsListener',
  'MobileOperator',
  'LockScreen',
  'SIMSlotManager',
  'AppWindowManager',
  'TouchForwarder'
]).init();

mocha.globals(['Clock', 'StatusBar']);
suite('system/Statusbar', function() {
  var mobileConnectionCount = 2;
  var fakeStatusBarNode, fakeTopPanel;
  var realMozL10n, realMozMobileConnections, realMozTelephony, fakeIcons = [];

  mocksForStatusBar.attachTestHelpers();
  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    requireApp('system/js/statusbar.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozTelephony = realMozTelephony;
  });

  setup(function() {
    for (var i = 1; i < mobileConnectionCount; i++) {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
    }
    fakeStatusBarNode = document.createElement('div');
    fakeStatusBarNode.id = 'statusbar';
    document.body.appendChild(fakeStatusBarNode);

    fakeTopPanel = document.createElement('div');
    fakeTopPanel.id = 'top-panel';
    document.body.appendChild(fakeTopPanel);

    StatusBar.ELEMENTS.forEach(function testAddElement(elementName) {
      var elt;
      if (elementName == 'system-downloads' ||
          elementName == 'network-activity') {
        elt = document.createElement('canvas');
      } else {
        elt = document.createElement('div');
      }
      elt.id = 'statusbar-' + elementName;
      elt.hidden = true;
      fakeStatusBarNode.appendChild(elt);
      fakeIcons[elementName] = elt;
    });

    // executing init again
    StatusBar.init();

    var signalElements = document.querySelectorAll('.statusbar-signal');
    var dataElements = document.querySelectorAll('.statusbar-data');

    fakeIcons.signals = {};
    Array.prototype.slice.call(signalElements).forEach(function(signal, index) {
      fakeIcons.signals[mobileConnectionCount - index - 1] = signal;
    });
    fakeIcons.data = {};
    Array.prototype.slice.call(dataElements).forEach(function(data, index) {
      fakeIcons.data[mobileConnectionCount - index - 1] = data;
    });
  });
  teardown(function() {
    fakeStatusBarNode.parentNode.removeChild(fakeStatusBarNode);
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
  });

  suite('init', function() {
    test('signal and data icons are created correctly', function() {
      assert.equal(Object.keys(fakeIcons.signals).length,
        mobileConnectionCount);
      assert.equal(Object.keys(fakeIcons.data).length, mobileConnectionCount);
    });
  });

  suite('system-downloads', function() {
    test('incrementing should display the icon', function() {
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
    test('incrementing then decrementing should not display the icon',
      function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isTrue(fakeIcons['system-downloads'].hidden);
    });
    test('incrementing twice then decrementing once should display the icon',
      function() {
      StatusBar.incSystemDownloads();
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
    test('incrementing then decrementing twice should not display the icon',
      function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isTrue(fakeIcons['system-downloads'].hidden);
    });


    /* JW: testing that we can't have a negative counter */

// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840500.
    test('incrementing then decrementing twice then incrementing should ' +
         'display the icon', function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
  });

  suite('time bar', function() {
    setup(function() {
      StatusBar.clock.stop();
      StatusBar.screen = document.createElement('div');
    });
    teardown(function() {
      StatusBar.screen = null;
    });
    test('first launch', function() {
      MockLockScreen.locked = true;
      StatusBar.init();
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('lock', function() {
      MockLockScreen.locked = true;
      var evt = new CustomEvent('lock');
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('unlock', function() {
      var evt = new CustomEvent('unlock');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('attentionscreen show', function() {
      var evt = new CustomEvent('attentionscreenshow');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('attentionsceen hide', function() {
      var evt = new CustomEvent('attentionscreenhide');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('emergency call when locked', function() {
      var evt = new CustomEvent('lockpanelchange', {
        detail: {
          panel: 'emergency-call'
        }
      });
      StatusBar.screen.classList.add('locked');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('moztime change', function() {
      var evt = new CustomEvent('moztimechange');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('screen enable but screen is unlocked', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: true
        }
      });
      MockLockScreen.locked = false;
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('screen enable and screen is locked', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: true
        }
      });
      MockLockScreen.locked = true;
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('screen disable', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: false
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
  });

  suite('signal icon', function() {
    var mockSimSlots;
    setup(function() {
      mockSimSlots = [];
      for (var i = 0; i < mobileConnectionCount; i++) {
        var mockSIMSlot =
          new MockSIMSlot(MockNavigatorMozMobileConnections[i], i);
        mockSimSlots.push(mockSIMSlot);
      }
    });

    teardown(function() {
      mockSimSlots = null;
    });

    for (var i = 0; i < mobileConnectionCount; i++) {
      (function(slotIndex) {
        suite('slot: ' + slotIndex, function() {
          var dataset;
          setup(function() {
            dataset = fakeIcons.signals[slotIndex].dataset;
            MockSIMSlotManager.mInstances = mockSimSlots;
          });

          test('no network without sim, not searching', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: null,
              emergencyCallsOnly: false,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = null;
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(true);

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.isUndefined(dataset.level);
            assert.notEqual(dataset.searching, 'true');
          });

          test('no network without sim, searching', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: null,
              emergencyCallsOnly: false,
              state: 'searching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = null;
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(true);

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.isUndefined(dataset.level);
            assert.notEqual(dataset.searching, 'true');
          });

          test('no network with sim, sim locked', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: null,
              emergencyCallsOnly: false,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
            sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

            StatusBar.update.signal.call(StatusBar);

            assert.equal(fakeIcons.signals[slotIndex].hidden, true);
          });

          test('searching', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: null,
              emergencyCallsOnly: false,
              state: 'searching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'ready';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.equal(dataset.level, -1);
            assert.equal(dataset.searching, 'true');
          });

          test('emergency calls only, no sim', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = null;
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(true);

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.isUndefined(dataset.level);
            assert.notEqual(dataset.searching, 'true');
          });

          test('emergency calls only, with sim', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
            sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

            StatusBar.update.signal.call(StatusBar);

            assert.equal(fakeIcons.signals[slotIndex].hidden, true);
          });

          test('emergency calls only, in call', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
            sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

            MockNavigatorMozTelephony.active = {
              state: 'connected'
            };

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.equal(dataset.level, 4);
            assert.notEqual(dataset.searching, 'true');
          });

          test('emergency calls only, dialing', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
            sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

            MockNavigatorMozTelephony.active = {
              state: 'dialing'
            };

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.equal(dataset.level, 4);
            assert.notEqual(dataset.searching, 'true');
          });

          test('emergency calls, passing a call', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
            sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

            StatusBar.update.signal.call(StatusBar);

            var activeCall = {
              state: 'dialing'
            };

            MockNavigatorMozTelephony.active = activeCall;
            MockNavigatorMozTelephony.calls = [activeCall];

            var evt = new CustomEvent('callschanged');
            MockNavigatorMozTelephony.mTriggerEvent(evt);

            assert.notEqual(dataset.roaming, 'true');
            assert.equal(dataset.level, 4);
            assert.notEqual(dataset.searching, 'true');
          });

          test('normal carrier', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: true,
              relSignalStrength: 80,
              emergencyCallsOnly: false,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'ready';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.equal(dataset.level, 4);
            assert.notEqual(dataset.searching, 'true');
          });

          test('roaming', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: true,
              relSignalStrength: 80,
              emergencyCallsOnly: false,
              state: 'notSearching',
              roaming: true,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'ready';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

            StatusBar.update.signal.call(StatusBar);

            assert.equal(dataset.roaming, 'true');
            assert.equal(dataset.level, 4);
            assert.notEqual(dataset.searching, 'true');
          });

          test('emergency calls, roaming', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: true,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'ready';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

            StatusBar.update.signal.call(StatusBar);

            assert.notEqual(dataset.roaming, 'true');
            assert.equal(dataset.level, -1);
            assert.notEqual(dataset.searching, 'true');
          });

          test('emergency calls, avoid infinite callback loop', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 80,
              emergencyCallsOnly: true,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
            sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

            var mockTel = MockNavigatorMozTelephony;

            StatusBar.update.signal.call(StatusBar);
            assert.equal(mockTel.mCountEventListener('callschanged',
                                                     StatusBar), 1);

            // Bug 880390: On B2G18 adding a 'callschanged' listener can trigger
            // another event immediately.  To avoid an infinite loop, the
            // listener must only be added once.  Simulate this immediate event
            // here and then check that we still only have one listener.

            var evt = new CustomEvent('callschanged');
            mockTel.mTriggerEvent(evt);
            assert.equal(mockTel.mCountEventListener('callschanged',
                                                     StatusBar), 1);
          });

          test('EVDO connection, show data call signal strength', function() {
            MockNavigatorMozMobileConnections[slotIndex].voice = {
              connected: false,
              relSignalStrength: 0,
              emergencyCallsOnly: false,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              relSignalStrength: 80,
              type: 'evdo',
              emergencyCallsOnly: false,
              state: 'notSearching',
              roaming: false,
              network: {}
            };

            mockSimSlots[slotIndex].simCard.cardState = 'ready';
            mockSimSlots[slotIndex].simCard.iccInfo = {};
            sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

            StatusBar.update.signal.call(StatusBar);
            assert.equal(dataset.level, 4);
          });
        });
      })(i);
    }
  });

  suite('data connection', function() {
    for (var i = 0; i < mobileConnectionCount; i++) {
      (function(slotIndex) {
        suite('slot: ' + slotIndex, function() {
          suite('data connection unavailable', function() {
            teardown(function() {
              StatusBar.settingValues = {};
            });

            test('radio disabled', function() {
              StatusBar.settingValues['ril.radio.disabled'] = true;
              StatusBar.update.data.call(StatusBar);
              assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
            });

            test('data disabled', function() {
              StatusBar.settingValues['ril.data.enabled'] = false;
              StatusBar.update.data.call(StatusBar);
              assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
            });

            test('data not connected', function() {
              MockNavigatorMozMobileConnections[slotIndex].data =
                { connected: false };
              StatusBar.update.data.call(StatusBar);
              assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
            });

            test('wifi icon is displayed', function() {
              StatusBar.icons.wifi.hidden = false;
              StatusBar.update.data.call(StatusBar);
              assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
            });
          });

          suite('data connection available', function() {
            setup(function() {
              StatusBar.settingValues['ril.radio.disabled'] = false;
              StatusBar.settingValues['ril.data.enabled'] = true;
              StatusBar.icons.wifi.hidden = true;
            });

            teardown(function() {
              StatusBar.settingValues = {};
            });

            test('type lte', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'lte'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '4G');
            });

            // GSM
            test('type hspa+', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'hspa+'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H+');
            });

            test('type hsdpa', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'hsdpa'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H');
            });

            test('type hsupa', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'hsupa'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H');
            });

            test('type hspa', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'hspa'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H');
            });

            test('type umts', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'umts'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '3G');
            });

            test('type edge', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'edge'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'E');
            });

            test('type gprs', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'gprs'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '2G');
            });

            // CDMA
            test('type 1xrtt', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: '1xrtt'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
            });

            test('type is95a', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'is95a'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
            });

            test('type is95b', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'is95b'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
            });

            // CDMA related to calls
            suite('CDMA network types when there is a call',
              function() {
                test('type ehrpd', function() {
                  MockNavigatorMozTelephony.calls = [{}];
                  MockNavigatorMozMobileConnections[slotIndex].data = {
                    connected: true,
                    type: 'ehrpd'
                  };
                  StatusBar.update.data.call(StatusBar);
                  assert.equal(StatusBar.icons.data[slotIndex].textContent,
                               '4G');
              });

              test('type evdo0', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'evdo0'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
              });

              test('type evdoa', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'evdoa'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
              });

              test('type evdob', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'evdob'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
              });

              test('type 1xrtt', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: '1xrtt'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
              });

              test('type is95a', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'is95a'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
              });

              test('type is95b', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'is95b'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
              });
            });

            suite('CDMA network types when there is no call',
              function() {
                test('type ehrpd', function() {
                  MockNavigatorMozMobileConnections[slotIndex].data = {
                    connected: true,
                    type: 'ehrpd'
                  };
                  StatusBar.update.data.call(StatusBar);
                  assert.equal(StatusBar.icons.data[slotIndex].textContent,
                               '4G');
              });

              test('type evdo0', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'evdo0'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, 'Ev');
              });

              test('type evdoa', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'evdoa'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, 'Ev');
              });

              test('type evdob', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'evdob'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, 'Ev');
              });

              test('type 1xrtt', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: '1xrtt'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
              });

              test('type is95a', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'is95a'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
              });

              test('type is95b', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'is95b'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
              });
            });
          });
        });
      })(i);
    }
  });

  suite('operator name', function() {
    setup(function() {
      MockNavigatorMozMobileConnections[0].voice = {
        connected: true,
        network: {
          shortName: 'Fake short',
          longName: 'Fake long',
          mnc: '10' // VIVO
        },
        cell: {
          gsmLocationAreaCode: 71 // BA
        }
      };
    });

    suite('single sim', function() {
      var conn;
      setup(function() {
        conn = MockNavigatorMozMobileConnections[1];
        MockNavigatorMozMobileConnections.mRemoveMobileConnection(1);
      });
      teardown(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 1);
      });

      test('Connection without region', function() {
        MockMobileOperator.mOperator = 'Orange';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.include(label_content, 'Orange');
      });

      test('Connection with region', function() {
        MockMobileOperator.mOperator = 'Orange';
        MockMobileOperator.mRegion = 'PR';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.include(label_content, 'Orange');
        assert.include(label_content, 'PR');
      });
    });

    suite('multiple sims', function() {
      test('Connection without region', function() {
        MockMobileOperator.mOperator = 'Orange';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.equal(-1, label_content.indexOf('Orange'));
      });

      test('Connection with region', function() {
        MockMobileOperator.mOperator = 'Orange';
        MockMobileOperator.mRegion = 'PR';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.equal(-1, label_content.indexOf('Orange'));
        assert.equal(-1, label_content.indexOf('PR'));
      });
    });
  });

  suite('media information', function() {
    test('geolocation is activating', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'geolocation-status',
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.geolocation.hidden, false);
    });
    test('camera is recording', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'recording-status',
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.recording.hidden, false);
    });
    test('usb is unmounting', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'volume-state-changed',
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.usb.hidden, false);
    });
    test('headphones is plugged in', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'headphones-status-changed',
          state: 'on'
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.headphones.hidden, false);
    });
    test('audio player is playing', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'audio-channel-changed',
          channel: 'content'
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.playing.hidden, false);
    });
  });

  suite('fullscreen mode >', function() {
    function forgeTouchEvent(type, x, y) {
        var touch = document.createTouch(window, null, 42, x, y,
                                         x, y, x, y,
                                         0, 0, 0, 0);
        var touchList = document.createTouchList(touch);
        var touches = (type == 'touchstart' || type == 'touchmove') ?
                           touchList : null;
        var changed = (type == 'touchmove') ?
                           null : touchList;

        var e = document.createEvent('TouchEvent');
        e.initTouchEvent(type, true, true,
                         null, null, false, false, false, false,
                         touches, null, changed);

        return e;
    }

    function fakeDispatch(type, x, y) {
      var e = forgeTouchEvent(type, x, y);
      StatusBar.panelTouchHandler(e);

      return e;
    }

    // Making sure the time-bounded features won't have side effects
    // outside of this suite.
    setup(function() {
      this.sinon.useFakeTimers();
    });

    teardown(function() {
      this.sinon.clock.tick(10000);
    });

    var app;
    setup(function() {
      app = {
        isFullScreen: function() {
          return true;
        },
        iframe: document.createElement('iframe')
      };

      this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
      this.sinon.stub(StatusBar.element, 'getBoundingClientRect').returns({
        height: 10
      });

      StatusBar.screen = document.createElement('div');
    });

    test('the status bar should open when the utilitytray is shown',
    function() {
      StatusBar.hide();

      var evt = new CustomEvent('utilitytrayshow');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should close when the utilitytray is hidden',
    function() {
      StatusBar.show();

      var evt = new CustomEvent('utilitytrayhide');
      StatusBar.handleEvent(evt);

      assert.isTrue(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should not close if the current app is not fullscreen',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      StatusBar.show();

      var evt = new CustomEvent('utilitytrayhide');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should open when the rocketbar is shown',
    function() {
      StatusBar.hide();

      var evt = new CustomEvent('rocketbarshown');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should close when the rocketbar is hidden',
    function() {
      StatusBar.show();

      var evt = new CustomEvent('rocketbarhidden');
      StatusBar.handleEvent(evt);

      assert.isTrue(StatusBar.element.classList.contains('invisible'));
    });

    suite('Revealing the StatusBar >', function() {
      teardown(function() {
        StatusBar.element.style.transform = '';
      });

      test('it should translate the statusbar on touchmove', function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        var transform = 'translateY(calc(5px - 100%))';

        assert.equal(StatusBar.element.style.transform, transform);
        fakeDispatch('touchend', 100, 5);
      });

      test('it should not translate the statusbar more than its height',
      function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        fakeDispatch('touchmove', 100, 15);
        var transform = 'translateY(calc(10px - 100%))';

        assert.equal(StatusBar.element.style.transform, transform);
        fakeDispatch('touchend', 100, 15);
      });

      suite('after the gesture', function() {
        suite('when the StatusBar is not fully displayed', function() {
          setup(function() {
            fakeDispatch('touchstart', 100, 0);
            fakeDispatch('touchmove', 100, 5);
            fakeDispatch('touchend', 100, 5);
          });

          test('it should hide it right away', function() {
            assert.equal(StatusBar.element.style.transform, '');
            assert.equal(StatusBar.element.style.transition, '');
          });
        });

        suite('when the StatusBar is fully displayed', function() {
          setup(function() {
            fakeDispatch('touchstart', 100, 0);
            fakeDispatch('touchmove', 100, 5);
            fakeDispatch('touchmove', 100, 15);
            fakeDispatch('touchend', 100, 15);
          });

          test('it should not hide it right away', function() {
            var transform = 'translateY(calc(10px - 100%))';
            assert.equal(StatusBar.element.style.transform, transform);
            assert.equal(StatusBar.element.style.transition,
                         'transform 0s ease 0s');
          });

          test('but after 5 seconds', function() {
            this.sinon.clock.tick(5000);
            assert.equal(StatusBar.element.style.transform, '');
            assert.equal(StatusBar.element.style.transition, '');
          });

          test('or if the user interacts with the app', function() {
            // We're faking a touchstart event on the app iframe
            var iframe = StatusBar._touchForwarder.destination;
            StatusBar._touchForwarder.destination = window;

            var e = forgeTouchEvent('touchstart', 100, 100);
            window.dispatchEvent(e);

            assert.equal(StatusBar.element.style.transform, '');
            assert.equal(StatusBar.element.style.transition, '');
            StatusBar._touchForwarder.destination = iframe;
          });
        });
      });
    });

    suite('Touch forwarding >', function() {
      var forwardSpy;

      setup(function() {
        forwardSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
      });

      test('it should prevent default on all touch events to prevent relows',
      function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        var touchmove = fakeDispatch('touchmove', 100, 2);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.isTrue(touchstart.defaultPrevented);
        assert.isTrue(touchmove.defaultPrevented);
        assert.isTrue(touchend.defaultPrevented);
      });

      test('it should set the destination of the TouchForwarder on touchstart',
      function() {
        fakeDispatch('touchstart', 100, 0);
        assert.equal(StatusBar._touchForwarder.destination, app.iframe);
        fakeDispatch('touchend', 100, 0);
      });

      test('it should forward taps to the app', function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 2);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.isTrue(forwardSpy.calledTwice);
        var call = forwardSpy.firstCall;
        assert.equal(call.args[0], touchstart);
        call = forwardSpy.getCall(1);
        assert.equal(call.args[0], touchend);
      });

      suite('if it\'s not a tap and the statusbar is not fully displayed',
      function() {
        test('it should not forward any events', function() {
          var touchstart = fakeDispatch('touchstart', 100, 0);
          fakeDispatch('touchmove', 100, 8);
          var touchend = fakeDispatch('touchend', 100, 8);

          assert.isTrue(forwardSpy.notCalled);
        });
      });

      test('it should forward touchmove once the statusbar is shown',
      function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 6);
        var secondMove = fakeDispatch('touchmove', 100, 12);
        var thirdMove = fakeDispatch('touchmove', 100, 18);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.equal(forwardSpy.callCount, 4);
        var call = forwardSpy.firstCall;
        assert.equal(call.args[0], touchstart);
        call = forwardSpy.getCall(1);
        assert.equal(call.args[0], secondMove);
        call = forwardSpy.getCall(2);
        assert.equal(call.args[0], thirdMove);
        call = forwardSpy.getCall(3);
        assert.equal(call.args[0], touchend);
      });
    });
  });
});
