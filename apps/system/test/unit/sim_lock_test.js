/* global SimLock, MockL10n, MocksHelper, SimPinDialog, MockSIMSlotManager */
/* global preInit, VersionHelper:true */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_version_helper.js');

var mocksHelperForSimLock = new MocksHelper([
  'SimPinDialog',
  'SIMSlotManager',
  'System',
  'VersionHelper'
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

  suite('when we are in ftu on first use', function() {
    setup(function() {
      this.sinon.stub(SimPinDialog, 'close');
      this.sinon.stub(SimLock, 'showIfLocked');
      SimLock.init();
    });

    test('no simpin dialog would show up on first run', function() {
      VersionHelper = window.MockVersionHelper(false);
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      VersionHelper.getVersionInfo();
      VersionHelper.resolve({ isUpgrade: function () {
                                return false;
                              }
                            });
      assert.isTrue(SimPinDialog.close.called);
    });

    test('simpin dialog would show up on upgrade', function() {
      VersionHelper = window.MockVersionHelper(true);
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      VersionHelper.getVersionInfo();
      VersionHelper.resolve({ isUpgrade: function () {
                                return true;
                              }
                            });
      assert.isFalse(SimPinDialog.close.called);
    });

  });

  suite('to test events', function() {
    test('when unlocking request comes, to check if it\'s for Camera',
    function() {
      var stubShowIfLocked = this.sinon.stub(SimLock, 'showIfLocked');
      SimLock.handleEvent('lockscreen-request-unlock');
      assert.isFalse(stubShowIfLocked.called,
        'should not show the dialog');
    });
  });
});
