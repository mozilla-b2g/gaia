/* global MocksHelper, System, MockSimLockSystemDialog */
/* global MockSIMSlotManager, MockVersionHelper, FtuLauncher, BaseModule */
/* global VersionHelper:true */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_version_helper.js');
requireApp('system/test/unit/mock_sim_lock_system_dialog.js');
requireApp('system/js/ftu_launcher.js');
requireApp('/shared/js/lazy_loader.js');
requireApp('system/js/system.js');
requireApp('system/js/base_module.js');
requireApp('system/js/sim_lock_manager.js');

var mocksHelperForSimLockManager = new MocksHelper([
  'SIMSlotManager',
  'System',
  'VersionHelper'
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
    subject.start();
    subject.simLockSystemDialog = new MockSimLockSystemDialog();
    this.sinon.stub(subject.simLockSystemDialog, 'show', function() {
      subject.simLockSystemDialog.visible = true;
    });
  });

  teardown(function() {
    subject.stop();
    subject.simLockSystemDialog.show.restore();
  });

  suite('when we are in ftu on first use', function() {
    var simLockSpy;

    setup(function() {
      this.sinon.stub(subject.simLockSystemDialog, 'close', function() {
        subject.simLockSystemDialog.visible = false;
      });
      simLockSpy = this.sinon.spy(subject, 'showIfLocked');
      this.sinon.stub(FtuLauncher, 'isFtuRunning', function() {
        return true;
      });
      subject._start();
    });

    teardown(function() {
      simLockSpy.restore();
    });

    test('no simpin dialog would show up on first run', function() {
      VersionHelper = MockVersionHelper(false);
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      VersionHelper.getVersionInfo();
      VersionHelper.resolve({ isUpgrade: function() {
                                return false;
                              }
                            });
      assert.isTrue(subject.simLockSystemDialog.close.called);
      assert.isFalse(simLockSpy.lastCall.returnValue);
    });

    test('simpin dialog would show up on upgrade', function() {
      VersionHelper = MockVersionHelper(true);
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      VersionHelper.getVersionInfo();
      VersionHelper.resolve({ isUpgrade: function() {
                                return true;
                              }
                            });
      //On updgrade, system will send an appopned event so we need to check it
      subject.handleEvent({
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
      assert.isTrue(subject.simLockSystemDialog.close.called);
      assert.isFalse(simLockSpy.lastCall.returnValue);
    });
  });

  suite('to test events', function() {
    test('when unlocking request comes, to check if it\'s for Camera',
      function() {
        var stubShowIfLocked = this.sinon.stub(subject, 'showIfLocked');
        subject.handleEvent('lockscreen-request-unlock');
        assert.isFalse(stubShowIfLocked.called,
          'should not show the dialog');
      });
  });

  suite('showIfLocked', function() {
    setup(function() {
      subject.simLockSystemDialog.show.reset();
      subject.simLockSystemDialog.visible = false;
    });

    teardown(function() {
    });

    test('should paint the first simslot on first render', function() {
      assert.isFalse(subject._alreadyShown);
      subject.showIfLocked();
      assert.isTrue(subject.simLockSystemDialog.show.called);
      assert.isTrue(subject._alreadyShown);
    });

    test('should not show if locked', function() {
      System.locked = true;
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
      System.locked = false;
    });

    test('should not show on Ftu', function() {
      sinon.stub(FtuLauncher, 'isFtuRunning').returns(true);
      sinon.stub(FtuLauncher, 'isFtuUpgrading').returns(false);
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
      FtuLauncher.isFtuUpgrading.restore();
      FtuLauncher.isFtuRunning.restore();
    });

    test('should not show during a call', function() {
      subject._duringCall = true;
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
      subject._duringCall = false;
    });

    suite('Multisim handling', function() {
      setup(function() {
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

      test('should render if alreadyShown and skipping', function() {
        subject.showIfLocked();
        subject.showIfLocked(1, true);
        assert.equal(subject.simLockSystemDialog.show.callCount, 2);
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
      subject.handleEvent(new CustomEvent('attentionopening', {
        detail: {
          CLASS_NAME: 'CallscreenWindow'
        }
      }));
      assert.isTrue(subject._duringCall);
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
