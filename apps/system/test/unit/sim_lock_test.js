/* global SimLock, MocksHelper, SimPinDialog, MockSIMSlotManager */
'use strict';

requireApp('system/js/mock_simslot_manager.js');
requireApp('system/test/unit/mock_simcard_dialog.js');

var mocksHelperForSimLock = new MocksHelper([
  'SimPinDialog',
  'SIMSlotManager'
]).init();

suite('SimLock', function() {
  mocksHelperForSimLock.attachTestHelpers();

  suiteSetup(function(done) {
    // load this later
    requireApp('system/js/sim_lock.js', done);
  });

  setup(function() {
    // inject one instance
    MockSIMSlotManager.mInstances.push({
      isAbsent: false
    });
  });

  suite('SIMSlotManager is not ready', function() {
    setup(function() {
      this.sinon.stub(SimLock, 'init');
    });

    test('simslotready event is registered', function() {
      window.dispatchEvent(new window.CustomEvent('simslotready'));
      assert.isTrue(SimLock.init.called);
    });
  });

  suite('when we are in ftu', function() {
    setup(function() {
      this.sinon.stub(SimPinDialog, 'close');
      this.sinon.stub(SimLock, 'showIfLocked');

      SimLock.init();
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
    });

    test('no simpin dialog would show up', function() {
      assert.isTrue(SimPinDialog.close.called);
    });
  });
});
