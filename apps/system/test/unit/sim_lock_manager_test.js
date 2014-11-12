/* global MocksHelper, System, MockSimLockSystemDialog */
/* global MockSIMSlotManager, BaseModule, MockSystem */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_version_helper.js');
requireApp('system/test/unit/mock_sim_lock_system_dialog.js');
requireApp('/system/shared/test/unit/mocks/mock_ftu_launcher.js');
requireApp('/shared/js/lazy_loader.js');
requireApp('system/js/base_module.js');
requireApp('system/js/sim_lock_manager.js');

var mocksHelperForSimLockManager = new MocksHelper([
  'System',
  'SIMSlotManager'
]).init();

suite('SimLockManager', function() {
  var subject;
  var realMozL10n;
  mocksHelperForSimLockManager.attachTestHelpers();

  function addSimSlot() {
    MockSIMSlotManager.mInstances.push({
      index: MockSIMSlotManager.mInstances.length,
      isAbsent: false,
      simCard: {
        cardState: 'pinRequired'
      }
    });
  }

  function removeSimSlot() {
    MockSIMSlotManager.mInstances.pop();
  }

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    // inject one instance
    addSimSlot();
    subject = BaseModule.instantiate('SimLockManager', {
      mobileConnections: []
    });
    subject.service = MockSystem;
    subject.start();
    subject.simLockSystemDialog = new MockSimLockSystemDialog();
    this.sinon.stub(subject.simLockSystemDialog, 'show', function() {
      subject.simLockSystemDialog.visible = true;
    });
  });

  teardown(function() {
    MockSystem.mTeardown();
    subject.stop();
    subject.simLockSystemDialog.show.restore();
  });

  suite('when we are in ftu on first use', function() {
    var simLockSpy;

    setup(function() {
      MockSIMSlotManager.ready = true;
      this.sinon.stub(subject.simLockSystemDialog, 'close', function() {
        subject.simLockSystemDialog.visible = false;
      });
      simLockSpy = this.sinon.spy(subject, 'showIfLocked');
    });

    teardown(function() {
      simLockSpy.restore();
    });

    test('no simpin dialog would show up on first run', function() {
      MockSystem.mUpgrading = false;
      MockSystem.runningFTU = true;
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      assert.isTrue(subject.simLockSystemDialog.close.called);
    });

    test('simpin dialog would show up on upgrade', function() {
      MockSystem.mUpgrading = true;
      MockSystem.runningFTU = true;
      window.dispatchEvent(new CustomEvent('ftuopen'));
      assert.isTrue(subject.simLockSystemDialog.show.called);
    });
  });

  suite('to test events', function() {
    setup(function() {
      this.sinon.stub(subject.simLockSystemDialog, 'close', function() {
        subject.simLockSystemDialog.visible = false;
      });
      this.sinon.spy(subject, 'showIfLocked');
    });

    test('when unlocking request comes, to check if it\'s for Camera',
      function() {
        subject.handleEvent('lockscreen-request-unlock');
        assert.isFalse(subject.showIfLocked.called,
          'should not show the dialog');
      });
  });

  suite('showIfLocked', function() {
    setup(function() {
      MockSIMSlotManager.ready = true;
      subject.simLockSystemDialog.show.reset();
      subject.simLockSystemDialog.visible = false;
    });

    teardown(function() {
    });

    test('should paint the first simslot on first render', function() {
      assert.isFalse(subject._alreadyShown);
      subject.showIfLocked();
      assert.isTrue(subject.simLockSystemDialog.show.called);
      subject.showIfLocked();
      assert.isTrue(subject.simLockSystemDialog.show.calledOnce);
      assert.isFalse(subject.simLockSystemDialog.show.calledTwice);
    });

    test('should not show if locked', function() {
      System.locked = true;
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
      System.locked = false;
    });

    test('should not show on Ftu', function() {
      MockSystem.mUpgrading = false;
      MockSystem.runningFTU = true;
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
    });

    suite('Multisim handling', function() {
      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
      });

      teardown(function() {
        removeSimSlot();
      });

      test('should not show the second dialog after first', function() {
        subject.showIfLocked();
        assert.equal(subject.simLockSystemDialog.show.callCount, 1);
      });

      test('should not render if alreadyShown and not skipping', function() {
        subject.showIfLocked();
        subject.showIfLocked();
        assert.equal(subject.simLockSystemDialog.show.callCount, 1);
      });
    });
  });

  suite('lockscreen request to unlock', function() {
    var stubShowIfLocked;
    setup(function() {
      stubShowIfLocked = this.sinon.stub(subject, 'showIfLocked');
    });

    teardown(function() {
      subject.simLockSystemDialog.visible = false;
    });

    test('launch camera from lockscreen', function() {
      var requestUnlockEvent = {
        type: 'lockscreen-request-unlock',
        detail: {
          activity: {
            name: 'record'
          }
        }
      };
      subject.handleEvent(requestUnlockEvent);
      assert.isFalse(stubShowIfLocked.called,
        'should not call showIfLocked');
    });


    test('when unlocking request comes, to check if it\'s for Camera, ' +
         'and subject.simLockSystemDialog is visible',
      function() {
        var stubDialogClose =
          this.sinon.stub(subject.simLockSystemDialog, 'close');
        subject.simLockSystemDialog.visible = true;
        var requestUnlockEvent = {
          type: 'lockscreen-request-unlock',
          detail: {
            activity: {
              name: 'record'
            }
          }
        };
        subject.handleEvent(requestUnlockEvent);
        assert.isTrue(stubDialogClose.called,
          'should close subject.simLockSystemDialog');
        assert.isFalse(stubShowIfLocked.called,
          'should not show the dialog');
      });

    test('unlock normally', function() {
      subject.handleEvent({
        type: 'lockscreen-request-unlock'
      });
      assert.isFalse(stubShowIfLocked.called,
        'should not call showIfLocked if app is not closed yet');
      window.dispatchEvent(new window.CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubShowIfLocked.called,
        'should call showIfLocked if app is closed');
    });

    test('callscreen window opening event', function() {
      subject.showIfLocked.restore();
      window.dispatchEvent(new CustomEvent('attentionopening', {
        detail: {
          CLASS_NAME: 'CallscreenWindow'
        }
      }));
      subject.showIfLocked();
      assert.isFalse(subject.showIfLocked());
    });

    test('callscreen window ending event', function() {
      subject.handleEvent(new CustomEvent('attentionterminated', {
        detail: {
          CLASS_NAME: 'CallscreenWindow'
        }
      }));
      assert.isFalse(subject._duringCall);
    });
  });
});
