'use strict';

suite('simSecurityItem', function() {
  var modules = [
    'shared_mocks/mock_simslot_manager',
    'unit/mock_airplane_mode_helper',
    'panels/root/sim_security_item'
  ];

  var map = {
    '*': {
      'shared/simslot_manager': 'shared_mocks/mock_simslot_manager',
      'shared/airplane_mode_helper': 'unit/mock_airplane_mode_helper'
    }
  };

  var simSecurityItem;
  var mockSIMSlotManager;
  var mockAirplaneModeHelper;

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(MockSIMSlotManager,
      MockAirplaneModeHelper, SimSecurityItem) {
        mockSIMSlotManager = MockSIMSlotManager;
        mockAirplaneModeHelper = MockAirplaneModeHelper;

        var element = document.createElement('div');
        simSecurityItem = SimSecurityItem(element);
        done();
    });
  });

  suite('_updateUI', function() {
    suite('if APM is on', function() {
      setup(function() {
        this.sinon.stub(mockAirplaneModeHelper, 'getStatus', function() {
          return 'enabled';
        });
        simSecurityItem._updateUI();
      });
      test('properties would be set correctly', function() {
        assert.equal(simSecurityItem._element.style.fontStyle, 'italic');
        assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
          'simCardNotReady');
      });
    });

    suite('if APM is off, and no simcard', function() {
      setup(function() {
        this.sinon.stub(mockAirplaneModeHelper, 'getStatus', function() {
          return 'disabled';
        });

        simSecurityItem._activeSlot = {
          simCard: {
            cardState: null
          }
        };

        simSecurityItem._updateUI();
      });

      test('properties would be set correctly', function() {
        assert.equal(simSecurityItem._element.style.fontStyle, 'italic');
        assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
          'noSimCard');
      });
    });

    suite('if APM is off, and simcard is unknown', function() {
      setup(function() {
        this.sinon.stub(mockAirplaneModeHelper, 'getStatus', function() {
          return 'disabled';
        });

        simSecurityItem._activeSlot = {
          simCard: {
            cardState: 'unknown'
          }
        };

        simSecurityItem._updateUI();
      });

      test('properties would be set correctly', function() {
        assert.equal(simSecurityItem._element.style.fontStyle, 'italic');
        assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
          'unknownSimCardState');
      });
    });

    suite('if APM is off, simcard is ready', function() {
      var pinEnabled = false;
      var clock;

      setup(function() {
        clock = this.sinon.useFakeTimers();
        this.sinon.stub(mockAirplaneModeHelper, 'getStatus', function() {
          return 'disabled';
        });

        simSecurityItem._activeSlot = {
          simCard: {
            cardState: 'normal',
            getCardLock: function() {
              var obj = {};
              obj.result = {};
              obj.result.enabled = pinEnabled;
              setTimeout(function() {
                if (obj.onsuccess) {
                  obj.onsuccess();
                }
              });
              return obj;
            }
          }
        };
      });

      teardown(function() {
        clock.restore();
      });

      test('and if pin is enabled', function() {
        pinEnabled = true;
        simSecurityItem._updateUI();
        clock.tick(0);

        assert.equal(simSecurityItem._element.style.fontStyle, 'normal');
        assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
          'enabled');
      });

      test('and if pin is disabled', function() {
        pinEnabled = false;
        simSecurityItem._updateUI();
        clock.tick(0);

        assert.equal(simSecurityItem._element.style.fontStyle, 'normal');
        assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
          'disabled');
      });
    });
  });

  suite('_getActiveSlot', function() {
    var realSlot = {
      isAbsent: function() {
        return false;
      }
    };

    var fakeSlot = {
      isAbsent: function() {
        return true;
      }
    };

    setup(function() {
      this.sinon.stub(mockSIMSlotManager, 'getSlots', function() {
        return [realSlot, fakeSlot];
      });
    });

    test('would get choosed one', function() {
      assert.equal(simSecurityItem._getActiveSlot(), realSlot);
    });
  });

  suite('enabled item', function() {
    setup(function() {
      this.sinon.stub(mockAirplaneModeHelper, 'addEventListener');
      this.sinon.stub(mockAirplaneModeHelper, 'removeEventListener');
      this.sinon.stub(simSecurityItem, '_boundUpdateUI');
    });

    suite('wont do anything', function() {
      test('if this is a single sim device', function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM', function() {
          return false;
        });
        simSecurityItem.enabled = true;
        assert.isFalse(simSecurityItem._boundUpdateUI.called);
      });

      test('if there is no active slot', function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM', function() {
          return true;
        });
        simSecurityItem._activeSlot = null;
        simSecurityItem.enabled = true;
        assert.isFalse(simSecurityItem._boundUpdateUI.called);
      });

      test('if internal state is the same with outter', function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM', function() {
          return true;
        });
        simSecurityItem._activeSlot = {};
        simSecurityItem._itemEnabled = true;
        simSecurityItem.enabled = true;
        assert.isFalse(simSecurityItem._boundUpdateUI.called);
      });
    });

    suite('would do related works', function() {
      setup(function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM', function() {
          return false;
        });
        simSecurityItem._activeSlot = {
          conn: {
            addEventListener: this.sinon.stub(),
            removeEventListener: this.sinon.stub()
          }
        };
        simSecurityItem._itemEnabled = null;
      });

      test('if we are going to enable simSecurityItem', function() {
        simSecurityItem.enabled = true;
        assert.isTrue(simSecurityItem._boundUpdateUI.called);
        assert.isTrue(mockAirplaneModeHelper.addEventListener.called);
        assert.isTrue(
          simSecurityItem._activeSlot.conn.addEventListener.called);
      });

      test('if we are going to disable simSecurityItem', function() {
        simSecurityItem.enabled = false;
        assert.isTrue(mockAirplaneModeHelper.removeEventListener.called);
        assert.isTrue(
          simSecurityItem._activeSlot.conn.removeEventListener.called);
      });
    });
  });
});
