/* global SimLock, MockL10n, MocksHelper, SimPinDialog, MockSIMSlotManager */
/* global MockSIMSlotManager, FtuLauncher */
/* global preInit, VersionHelper:true */

'use strict';

requireApp('system/js/mock_simslot_manager.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_version_helper.js');
requireApp('system/js/ftu_launcher.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksHelperForSimLock = new MocksHelper([
  'SimPinDialog',
  'SIMSlotManager',
  'VersionHelper',
  'System'
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
    var simLockSpy;

    setup(function() {
      this.sinon.stub(SimPinDialog, 'close');
      simLockSpy = this.sinon.spy(SimLock, 'showIfLocked');
        this.sinon.stub(FtuLauncher, 'isFtuRunning', function() {
        return true;
      });
      SimLock.init();
    });

    teardown(function() {
      simLockSpy.restore();
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
      assert.isFalse(simLockSpy.lastCall.returnValue);
    });

    test('simpin dialog would show up on upgrade', function() {
      VersionHelper = window.MockVersionHelper(true);
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      VersionHelper.getVersionInfo();
      VersionHelper.resolve({ isUpgrade: function () {
                                return true;
                              }
                            });
      //On updgrade, system will send an appopned event so we need to check it
      SimLock.handleEvent({
        type: 'appopened',
        detail: {
          url: 'app://ftu.gaiamobile.org/index.html',
          manifestURL: 'app://ftu.gaiamobile.org/manifest.webapp',
          manifest: {
            permissions: {
              telephony: {access: 'readwrite'}
            }
          },
          origin: 'app://ftu.gaiamobile.org'
        }
      });
      assert.isTrue(SimPinDialog.close.called);
      assert.isFalse(simLockSpy.lastCall.returnValue);
    });

    test('launch camera from lockscreen when simpin is locked', function() {
      SimPinDialog.visible = true;
      SimLock.handleEvent({
        type: 'will-unlock',
        detail: {
          areaCamera: true
        }
      });
      assert.isTrue(SimPinDialog.close.called);
      assert.isTrue(simLockSpy.called);
      SimPinDialog.visible = false;
    });
  });
});
