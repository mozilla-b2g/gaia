/* global BaseModule, Promise, Notification, MockSIMSlotManager */
'use strict';

require('shared/js/lazy_loader.js');
requireApp('system/js/system.js');
requireApp('system/js/base_module.js');
requireApp('system/js/eu_roaming_manager.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');

suite('system/EuRoamingManager', function() {
  setup(function() {
    this.fakeConnections = [{
      addEventListener: function() {},
      data: {
        connected: true
      }
    }];

    this.euRoamingManager = BaseModule.instantiate('EuRoamingManager', {
      mobileConnections: this.fakeConnections
    });
  });

  teardown(function() {
    navigator.mozMobileConnections = this.reallMobileConnections;
  });

  suite('start', function() {
    setup(function() {
      this.sinon.stub(this.euRoamingManager, '_clearNotifications');
      this.sinon.stub(this.euRoamingManager, '_init');
    });

    test('should clear notifications and init the module', function() {
      this.euRoamingManager.start();
      sinon.assert.called(this.euRoamingManager._clearNotifications);
      sinon.assert.called(this.euRoamingManager._init);
    });
  });

  suite('_init', function() {
    setup(function() {
      var that = this;
      this.mockEuRoamingFile = {
        home: {
          '000': {
            '11': true
          }
        },
        foreign: {
          '000': {
            '11': true
          }
        }
      };

      this.sinon.stub(this.euRoamingManager, '_loadJSON', function() {
        return new Promise(function(resolve) {
          resolve(that.mockEuRoamingFile);
        });
      });
      this.sinon.stub(this.euRoamingManager, '_initValues');
      this.sinon.stub(this.euRoamingManager, '_addSimChangeListener');
      this.sinon.stub(this.euRoamingManager, '_addDataChangeListener');
      this.sinon.stub(this.euRoamingManager, '_tryShowEuRoamingNotification');
    });

    test('should init operator lists properly', function(done) {
      this.mockEuRoamingFile = {
        home: {},
        foreign: {}
      };

      this.euRoamingManager._init().then(function() {
        assert.equal(this.euRoamingManager._homeOperatorList,
          this.mockEuRoamingFile.home);
        assert.equal(this.euRoamingManager._foreignOperatorList,
          this.mockEuRoamingFile.foreign);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should init listeners properly and do an initial update when EU ' +
      'roaming operators are available', function(done) {
        this.euRoamingManager._init().then(function() {
          sinon.assert.calledOnce(this.euRoamingManager._initValues);
          sinon.assert.calledOnce(this.euRoamingManager._addSimChangeListener);
          sinon.assert.calledOnce(this.euRoamingManager._addDataChangeListener);
          this.fakeConnections.forEach(function(conn, index) {
            sinon.assert.calledWith(
              this.euRoamingManager._tryShowEuRoamingNotification, conn, index);
          }, this);
        }.bind(this), function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
    });

    test('should not init listeners properly and do an initial update when ' +
      'EU roaming operators are unavailable', function(done) {
        this.mockEuRoamingFile = null;
        this.euRoamingManager._init().then(function() {
          sinon.assert.notCalled(this.euRoamingManager._initValues);
          sinon.assert.notCalled(this.euRoamingManager._addSimChangeListener);
          sinon.assert.notCalled(this.euRoamingManager._addDataChangeListener);
          sinon.assert.notCalled(
            this.euRoamingManager._tryShowEuRoamingNotification);
        }.bind(this), function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
    });
  });

  suite('_initValues', function() {
    suiteSetup(function() {
      this.fakeSlots = [{
        simCard: {
          iccInfo: {
            mcc: '000',
            mnc: '11'
          }
        }
      }, {
        simCard: {
          iccInfo: null
        }
      }, {}];

      this.realSIMSlotManager = window.SIMSlotManager;
      window.SIMSlotManager = MockSIMSlotManager;
      MockSIMSlotManager.mInstances = this.fakeSlots;
    });

    suiteTeardown(function() {
      window.SIMSlotManager = this.realSIMSlotManager;
    });

    test('should init _simMobileCodes properly', function() {
      this.euRoamingManager._initValues();

      assert.deepEqual(this.euRoamingManager._curNetworkMobileCodes,
        [null, null, null]);
      assert.deepEqual(this.euRoamingManager._simMobileCodes,
        [this.fakeSlots[0].simCard.iccInfo, null, null]);
    });
  });

  suite('_isEURoamingHomeOperator', function() {
    setup(function() {
      this.fakeHomeOperatorList = {
        '000': {
          '11': true
        }
      };
      this.euRoamingManager._homeOperatorList = this.fakeHomeOperatorList;
    });

    test('should return true when the mcc and mnc are matched', function() {
      assert.isTrue(
        this.euRoamingManager._isEURoamingHomeOperator('000', '11'));
    });

    test('should return false when the mcc and mnc are not matched',
      function() {
        assert.isFalse(
          this.euRoamingManager._isEURoamingHomeOperator('000', '22'));
    });

    test('should return false when _homeOperatorList is not available',
      function() {
        this.euRoamingManager._homeOperatorList = null;
        assert.isFalse(
          this.euRoamingManager._isEURoamingHomeOperator('000', '11'));
    });

    test('should return false when mcc is not available', function() {
      assert.isFalse(
        this.euRoamingManager._isEURoamingHomeOperator(null, '11'));
    });

    test('should return false when mnc is not available', function() {
      assert.isFalse(
        this.euRoamingManager._isEURoamingHomeOperator('000', null));
    });
  });

  suite('_isEURoamingForeignOperator', function() {
    setup(function() {
      this.fakeForeignOperatorList = {
        '000': {
          '11': true
        }
      };
      this.euRoamingManager._foreignOperatorList = this.fakeForeignOperatorList;
    });

    test('should return true when the mcc and mnc are matched', function() {
      assert.isTrue(
        this.euRoamingManager._isEURoamingForeignOperator('000', '11'));
    });

    test('should return false when the mcc and mnc are not matched',
      function() {
        assert.isFalse(
          this.euRoamingManager._isEURoamingForeignOperator('000', '22'));
    });

    test('should return false when _foreignOperatorList is not available',
      function() {
        this.euRoamingManager._foreignOperatorList = null;
        assert.isFalse(
          this.euRoamingManager._isEURoamingForeignOperator('000', '11'));
    });

    test('should return false when mcc is not available', function() {
      assert.isFalse(
        this.euRoamingManager._isEURoamingForeignOperator(null, '11'));
    });

    test('should return false when mnc is not available', function() {
      assert.isFalse(
        this.euRoamingManager._isEURoamingForeignOperator('000', null));
    });
  });

  suite('_addSimChangeListener', function() {
    test('listeners are added correctly', function() {
      this.sinon.stub(window, 'addEventListener');
      this.sinon.stub(this.euRoamingManager, '_onSimChanged');

      this.euRoamingManager._addSimChangeListener();
      ['updated', 'iccinfochange', 'cardstatechange'].forEach(
        function(eventName, index) {
          sinon.assert.calledWith(window.addEventListener,
            'simslot-' + eventName);
          window.addEventListener.args[index][1]();
      });
      assert.equal(this.euRoamingManager._onSimChanged.callCount, 3);
    });
  });

  suite('_addDataChangeListener', function() {
    test('listeners are added correctly', function() {
      this.fakeConnections.forEach(function(conn) {
        this.sinon.stub(conn, 'addEventListener');
      }, this);
      this.sinon.stub(this.euRoamingManager, '_tryShowEuRoamingNotification');


      this.euRoamingManager._addDataChangeListener();
      this.fakeConnections.forEach(function(conn, index) {
        sinon.assert.calledWith(conn.addEventListener, 'datachange');
        conn.addEventListener.args[index][1]();
      });
      assert.equal(
        this.euRoamingManager._tryShowEuRoamingNotification.callCount,
        this.fakeConnections.length);
    });
  });

  suite('_onSimChanged', function() {
    suiteSetup(function() {
      this.fakeSlots = [{
        index: 0,
        conn: {},
        simCard: {
          iccInfo: {
            mcc: '000',
            mnc: '11'
          }
        }
      }, {
        index: 1,
        simCard: {
          iccInfo: null
        }
      }, {
        index: 2
      }];
    });

    setup(function() {
      this.sinon.stub(this.euRoamingManager, '_tryShowEuRoamingNotification');
    });

    test('should set _simMobileCodes and call to ' +
      '_tryShowEuRoamingNotification properly', function() {
      this.euRoamingManager._onSimChanged({
        detail: this.fakeSlots[0]
      });

      assert.deepEqual(this.euRoamingManager._simMobileCodes[0],
        this.fakeSlots[0].simCard.iccInfo);
      sinon.assert.calledWith(
        this.euRoamingManager._tryShowEuRoamingNotification,
        this.fakeSlots[0].conn, this.fakeSlots[0].index);
    });

    test('should not called to _tryShowEuRoamingNotification when iccInfo is ' +
      'not available', function() {
        // Use slots that have no iccInfo available.
        this.euRoamingManager._onSimChanged({
          detail: this.fakeSlots[1]
        });
        this.euRoamingManager._onSimChanged({
          detail: this.fakeSlots[2]
        });

        sinon.assert.notCalled(
          this.euRoamingManager._tryShowEuRoamingNotification);
    });

    test('should not change _simMobileCodes when iccInfo is not available',
      function() {
        var fakeMobileCodes = {};
        this.euRoamingManager._simMobileCodes = [fakeMobileCodes];
        // Use slots that have no iccInfo available.
        this.euRoamingManager._onSimChanged({});

        assert.equal(this.euRoamingManager._simMobileCodes[0], fakeMobileCodes);
    });
  });

  suite('_tryShowEuRoamingNotification', function() {
    setup(function() {
      this.sinon.stub(this.euRoamingManager, '_isEURoamingHomeOperator');
      this.sinon.stub(this.euRoamingManager, '_isEURoamingForeignOperator');
      this.sinon.stub(this.euRoamingManager, '_getState', function() {
        return Promise.resolve();
      });
      this.sinon.stub(this.euRoamingManager, '_setState', function() {
        return Promise.resolve();
      });
      this.sinon.stub(this.euRoamingManager, '_showNotification');
    });

    suite('when new network is detected', function() {
      setup(function() {
        this.targetIndex = 0;
        this.originalMobileCodes = { mcc: '000', mnc: '111' };
        this.currentMobileCodes = { mcc: '222', mnc: '333' };
        this.euRoamingManager._curNetworkMobileCodes[this.targetIndex] =
          this.originalMobileCodes;
      });

      test('should update _curNetworkMobileCodes', function() {
        this.euRoamingManager._tryShowEuRoamingNotification({
          data: {
            network: this.currentMobileCodes
          }
        }, this.targetIndex);

        assert.deepEqual(
          this.euRoamingManager._curNetworkMobileCodes[this.targetIndex],
          this.currentMobileCodes);
      });

      suite('when the mobile codes are matched and roaming', function() {
        setup(function() {
          this.euRoamingManager._isEURoamingHomeOperator.restore();
          this.euRoamingManager._isEURoamingForeignOperator.restore();
          this.sinon.stub(this.euRoamingManager, '_isEURoamingHomeOperator')
            .returns(true);
          this.sinon.stub(this.euRoamingManager,
            '_isEURoamingForeignOperator').returns(true);
        });

        test('should set the value under EU_ROAMING_ENABLED_KEY to true',
          function(done) {
            this.euRoamingManager._tryShowEuRoamingNotification({
              data: {
                roaming: true,
                network: this.currentMobileCodes
              }
            }, this.targetIndex).then(function() {
              sinon.assert.calledWith(this.euRoamingManager._setState,
                this.euRoamingManager.EU_ROAMING_ENABLED_KEY + this.targetIndex,
                true);
            }.bind(this)).then(done, done);
        });

        test('should show notification when the value under ' +
          'EU_ROAMING_NOTIFICATION_STATE_KEY is not NOTIFICATION_STATES.OPENED',
          function(done) {
            var that = this;
            this.euRoamingManager._getState.restore();
            this.sinon.stub(this.euRoamingManager, '_getState', function() {
              return Promise.resolve(
                that.euRoamingManager.NOTIFICATION_STATES.DISPLAYED);
            });

            this.euRoamingManager._tryShowEuRoamingNotification({
              data: {
                roaming: true,
                network: this.currentMobileCodes
              }
            }, this.targetIndex).then(function() {
              sinon.assert.called(this.euRoamingManager._showNotification);
              // Should also set the value to NOTIFICATION_STATES.DISPLAYED
              sinon.assert.calledWith(this.euRoamingManager._setState,
                this.euRoamingManager.EU_ROAMING_NOTIFICATION_STATE_KEY +
                  this.targetIndex,
                this.euRoamingManager.NOTIFICATION_STATES.DISPLAYED);
            }.bind(this)).then(done, done);
        });

        test('should not show notification when the value under ' +
          'EU_ROAMING_NOTIFICATION_STATE_KEY is NOTIFICATION_STATES.OPENED',
          function(done) {
            var that = this;
            this.euRoamingManager._getState.restore();
            this.sinon.stub(this.euRoamingManager, '_getState', function() {
              return Promise.resolve(
                that.euRoamingManager.NOTIFICATION_STATES.OPENED);
            });

            this.euRoamingManager._tryShowEuRoamingNotification({
              data: {
                roaming: true,
                network: this.currentMobileCodes
              }
            }, this.targetIndex).then(function() {
              sinon.assert.notCalled(this.euRoamingManager._showNotification);
            }.bind(this)).then(done, done);
        });
      });

      suite('when the mobile codes are not matched or not roaming', function() {
        setup(function(done) {
          this.euRoamingManager._tryShowEuRoamingNotification({
            data: {
              roaming: false,
              network: this.currentMobileCodes
            }
          }, this.targetIndex).then(function() {
            done();
          });
        });

        test('should set the value under EU_ROAMING_ENABLED_KEY to false',
          function() {
            sinon.assert.calledWith(this.euRoamingManager._setState,
              this.euRoamingManager.EU_ROAMING_ENABLED_KEY + this.targetIndex,
              false);
        });

        test('should set the value under EU_ROAMING_NOTIFICATION_STATE_KEY ' +
          ' to NOTIFICATION_STATES.UNAVAILABLE',
          function() {
            sinon.assert.calledWith(this.euRoamingManager._setState,
              this.euRoamingManager.EU_ROAMING_NOTIFICATION_STATE_KEY +
                this.targetIndex,
              this.euRoamingManager.NOTIFICATION_STATES.UNAVAILABLE);
        });
      });
    });

    suite('when network is not changed', function() {
      setup(function() {
        this.targetIndex = 0;
        this.originalMobileCodes = { mcc: '000', mnc: '111' };
        this.currentMobileCodes = { mcc: '000', mnc: '111' };
        this.euRoamingManager._curNetworkMobileCodes[this.targetIndex] =
          this.originalMobileCodes;
      });

      test('should not update _curNetworkMobileCodes', function() {
        this.euRoamingManager._tryShowEuRoamingNotification({
          data: {
            network: this.currentMobileCodes
          }
        }, this.targetIndex);

        assert.equal(
          this.euRoamingManager._curNetworkMobileCodes[this.targetIndex],
          this.originalMobileCodes);
      });
    });
  });

  suite('_clearNotifications', function() {
    setup(function() {
      this.notificationOfEuRoaming = {
        tag: this.euRoamingManager.TAG_PREFIX + 'tag',
        close: sinon.spy()
      };
      this.notificationOfOthers = {
        tag: 'othertag',
        close: sinon.spy()
      };
      this.fakeNotifications = [
        this.notificationOfEuRoaming,
        this.notificationOfOthers
      ];
      this.sinon.stub(Notification, 'get', function() {
        return Promise.resolve(this.fakeNotifications);
      }.bind(this));
    });

    test('should close notifications', function(done) {
      this.euRoamingManager._clearNotifications()
      .then(function() {
        sinon.assert.called(this.notificationOfEuRoaming.close);
        sinon.assert.notCalled(this.notificationOfOthers.close);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_showNotification', function() {
    suiteSetup(function() {
      this.realL10n = navigator.mozL10n;
      navigator.mozL10n = {
        get: function(key) { return key; }
      };
    });

    suiteTeardown(function() {
      navigator.mozL10n = this.realL10n;
    });

    setup(function() {
      this.targetIndex = 0;
      this.fakeNotification = {
        onclick: null,
        onclose: null,
        close: sinon.spy()
      };
      this.sinon.stub(window, 'Notification', function() {
        return this.fakeNotification;
      }.bind(this));
    });

    test('should show notification', function() {
      this.euRoamingManager._showNotification(this.targetIndex);

      sinon.assert.calledWith(window.Notification,
        'euRoamingNotificationTitle');
      var notificationOption = window.Notification.args[0][1];
      assert.equal(notificationOption.tag,
        this.euRoamingManager.TAG_PREFIX + this.targetIndex);
      assert.equal(notificationOption.body,
        'euRoamingNotificationMsg');
    });

    test('should trigger settings activity when clicking on it', function() {
      this.sinon.stub(this.euRoamingManager, '_triggerSettingsActivity');

      this.euRoamingManager._showNotification(this.targetIndex);
      this.fakeNotification.onclick();

      sinon.assert.calledWith(this.euRoamingManager._triggerSettingsActivity,
        this.targetIndex);
      sinon.assert.called(this.fakeNotification.close);
    });
  });
});
