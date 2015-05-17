/* global SIMSlotManager, SIMSlot, SimSettingsHelper, MocksHelper */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForSIMSettingsHelper = new MocksHelper([
  'SIMSlot',
  'SIMSlotManager',
  'SettingsListener'
]).init();

suite('SimSettingsHelper > ', function() {

  mocksForSIMSettingsHelper.attachTestHelpers();

  suiteSetup(function(done) {
    SIMSlotManager.mInstances.push(new SIMSlot());
    SIMSlotManager.mInstances.push(new SIMSlot());
    requireApp('system/js/sim_settings_helper.js', done);
  });

  setup(function() {
    // because MocksHelper will call teardown()
    // each time, we have to put it back
    SIMSlotManager.mInstances.push(new SIMSlot());
    SIMSlotManager.mInstances.push(new SIMSlot());
    SIMSlotManager.hasOnlyOneSIMCardDetected = function() {};
  });

  suite('slots > ', function() {
    setup(function() {
      this.sinon.useFakeTimers();
      this.sinon.stub(SimSettingsHelper, 'setServiceOnCard');
      setSlotAbsent(0, true);
      setSlotAbsent(1, true);
    });

    suite('are all absent > ', function() {
      setup(function() {
        setSlotAbsent(0, true);
        setSlotAbsent(1, true);
        SimSettingsHelper.start();
        emitSimslotReadyEvent();
        this.sinon.clock.tick(1000);
      });
      test('setServiceOnCard > ', function() {
        assert.isFalse(SimSettingsHelper.setServiceOnCard.called);
      });
    });

    suite('are all not absent > ', function() {
      setup(function() {
        setSlotAbsent(0, false);
        setSlotAbsent(1, false);
        SimSettingsHelper.start();
        emitSimslotReadyEvent();
        this.sinon.clock.tick(1000);
      });
      test('setServiceOnCard > ', function() {
        assert.isFalse(SimSettingsHelper.setServiceOnCard.called);
      });
    });

    suite('one is absent while the other one is not >', function() {
      setup(function() {
        this.sinon.stub(SIMSlotManager, 'hasOnlyOneSIMCardDetected',
          function() {
            return true;
          });
        setSlotAbsent(0, true);
        setSlotAbsent(1, false);
        SimSettingsHelper.start();
        emitSimslotReadyEvent();
        this.sinon.clock.tick(1000);
      });
      test('setServiceOnCard > ', function() {
        var calledkeys = [];
        SimSettingsHelper.setServiceOnCard.args.forEach(function(eachArg) {
          calledkeys.push(eachArg[0]);
        });

        assert.include(calledkeys, 'outgoingCall');
        assert.include(calledkeys, 'outgoingData');
        assert.include(calledkeys, 'outgoingMessages');
      });
    });
  });

  function emitSimslotReadyEvent() {
    SIMSlotManager.ready = true;
    window.dispatchEvent(new CustomEvent('simslotready'));
  }

  function setSlotAbsent(slotIndex, absent) {
    SIMSlotManager.mInstances[slotIndex].isAbsent = function() {
      return absent;
    };
  }
});
