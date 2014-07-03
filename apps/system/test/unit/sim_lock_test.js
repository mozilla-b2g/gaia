/* global SimLock, MockL10n, MocksHelper, SimPinDialog, MockSIMSlotManager */
/* global preInit */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
requireApp('system/test/unit/mock_l10n.js');

var mocksHelperForSimLock = new MocksHelper([
  'SimPinDialog',
  'SIMSlotManager'
]).init();

suite('SimLock', function() {
  var realMozL10n;
  mocksHelperForSimLock.attachTestHelpers();

  suiteSetup(function(done) {
    // load this later
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    requireApp('system/js/sim_lock.js', function() {
      preInit();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
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
