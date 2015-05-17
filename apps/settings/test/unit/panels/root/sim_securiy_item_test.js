'use strict';

suite('simSecurityItem', function() {
  var modules = [
    'shared_mocks/mock_simslot_manager',
    'unit/mock_airplane_mode_helper',
    'modules/sim_security',
    'panels/root/sim_security_item',
  ];

  var map = {
    '*': {
      'shared/simslot_manager': 'shared_mocks/mock_simslot_manager',
      'shared/airplane_mode_helper': 'unit/mock_airplane_mode_helper',
      'modules/sim_security': 'MockSimSecurity'
    }
  };

  var simSecurityItem;
  var mockSIMSlotManager;
  var mockAirplaneModeHelper;
  var mockSimSecurity;

  setup(function(done) {
    var self = this;

    define('MockSimSecurity', function() {
      return {
        addEventListener: function() {},
        getCardLock: function() {}
      };
    });

    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(MockSIMSlotManager,
      MockAirplaneModeHelper, MockSimSecurity ,SimSecurityItem) {
        mockSIMSlotManager = MockSIMSlotManager;
        mockAirplaneModeHelper = MockAirplaneModeHelper;
        mockSimSecurity = MockSimSecurity;

        self.sinon.stub(mockSIMSlotManager, 'get', function() {
          return {
            isAbsent: function() {
              return false;
            }
          };
        });

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
      });

      test('properties would be set correctly', function(done) {
        simSecurityItem._updateUI().then(function() {
          assert.equal(simSecurityItem._element.style.fontStyle, 'italic');
          assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
            'simCardNotReady');
        }).then(done, done);
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
      });

      test('properties would be set correctly', function(done) {
        simSecurityItem._updateUI().then(function() {
          assert.equal(simSecurityItem._element.style.fontStyle, 'italic');
          assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
            'noSimCard');
        }).then(done, done);
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
      });

      test('properties would be set correctly', function(done) {
        simSecurityItem._updateUI().then(function() {
          assert.equal(simSecurityItem._element.style.fontStyle, 'italic');
          assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
            'unknownSimCardState');
        }).then(done, done);
      });
    });

    suite('if APM is off, simcard is ready', function() {
      setup(function() {
        this.sinon.stub(mockAirplaneModeHelper, 'getStatus', function() {
          return 'disabled';
        });

        simSecurityItem._activeSlot = {
          simCard: {
            cardState: 'normal'
          }
        };

      });

      test('and if pin is enabled', function(done) {
        this.sinon.stub(mockSimSecurity, 'getCardLock', function() {
          return Promise.resolve({
            enabled: true
          });
        });

        simSecurityItem._updateUI().then(function() {
          assert.equal(simSecurityItem._element.style.fontStyle, 'normal');
          assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
            'enabled');
        }).then(done, done);
      });

      test('and if pin is disabled', function(done) {
        this.sinon.stub(mockSimSecurity, 'getCardLock', function() {
          return Promise.resolve({
            enabled: false
          });
        });

        simSecurityItem._updateUI().then(function() {
          assert.equal(simSecurityItem._element.style.fontStyle, 'normal');
          assert.equal(simSecurityItem._element.getAttribute('data-l10n-id'),
            'disabled');
        }).then(done, done);
      });
    });
  });

  suite('enabled item', function() {
    setup(function() {
      this.sinon.stub(mockAirplaneModeHelper, 'addEventListener');
      this.sinon.stub(mockAirplaneModeHelper, 'removeEventListener');
      this.sinon.stub(simSecurityItem, '_boundUpdateUI');
    });

    suite('wont do anything', function() {
      test('if this is a DSDS device', function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM', function() {
          return true;
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
        simSecurityItem._activeSlot = {};
        simSecurityItem._itemEnabled = null;
      });

      test('if we are going to enable simSecurityItem', function() {
        simSecurityItem.enabled = true;
        assert.isTrue(simSecurityItem._boundUpdateUI.called);
        assert.isTrue(mockAirplaneModeHelper.addEventListener.called);
      });

      test('if we are going to disable simSecurityItem', function() {
        simSecurityItem.enabled = false;
        assert.isTrue(mockAirplaneModeHelper.removeEventListener.called);
      });
    });
  });
});
