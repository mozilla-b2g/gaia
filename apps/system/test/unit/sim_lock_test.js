/* global SimLock, MockL10n, MocksHelper, SimPinDialog, System */
/* global MockSIMSlotManager, MockSIMSlot */
/* global MockVersionHelper, FtuLauncher */
/* global preInit, VersionHelper:true, MockApplications */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_version_helper.js');
requireApp('system/js/ftu_launcher.js');

var mocksHelperForSimLock = new MocksHelper([
  'SimPinDialog',
  'SIMSlotManager',
  'System',
  'VersionHelper'
]).init();

suite('SimLock', function() {
  var realMozL10n;
  mocksHelperForSimLock.attachTestHelpers();

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
    addSimSlot();
    window.applications = MockApplications;
    window.applications.ready = true;
    this.sinon.stub(SimPinDialog, 'show', function() {
      SimPinDialog.visible = true;
    });
  });

  teardown(function() {
    SimPinDialog.show.restore();
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
      this.sinon.stub(SimPinDialog, 'close', function() {
        SimPinDialog.visible = false;
      });
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
      VersionHelper = MockVersionHelper(false);
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      VersionHelper.getVersionInfo();
      VersionHelper.resolve({ isUpgrade: function() {
                                return false;
                              }
                            });
      assert.isTrue(SimPinDialog.close.called);
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
  });

  suite('to test events', function() {
    setup(function() {
      this.sinon.stub(SimPinDialog, 'close', function() {
        SimPinDialog.visible = false;
      });
      this.sinon.spy(SimLock, 'showIfLocked');
    });

    test('when unlocking request comes, to check if it\'s for Camera',
      function() {
        SimLock.handleEvent('lockscreen-request-unlock');
        assert.isFalse(SimLock.showIfLocked.called,
          'should not show the dialog');
      });

    test('home press on dialog visible', function() {
      SimPinDialog.visible = true;
      SimLock.handleEvent({
        type: 'home'
      });
      assert.isTrue(SimPinDialog.close.called, 'should close the dialog');
      SimPinDialog.visible = false;
    });

    test('home press on dialog not visible', function() {
      SimPinDialog.visible = false;
      SimLock.handleEvent({
        type: 'home'
      });
      assert.isFalse(SimPinDialog.close.called, 'should close the dialog');
    });

    test('Settings app is opened', function() {
      SimPinDialog.visible = true;
      SimLock.handleEvent({
        type: 'appopened',
        detail: {
          url: 'app://settings.gaiamobile.org/index.html',
          manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
          manifest: {
            permissions: {
              telephony: {access: 'readwrite'}
            }
          },
          origin: 'app://settings.gaiamobile.org'
        }
      });
      assert.isTrue(SimPinDialog.close.called);
      assert.isFalse(SimLock.showIfLocked.called);
    });
  });

  suite('isBothSlotsLocked', function() {
    setup(function() {
      MockSIMSlotManager.ready = true;
    });

    teardown(function() {
    });

    test('is not multisim', function() {
      assert.isFalse(SimLock.isBothSlotsLocked());
    });

    suite('only one sim detected', function() {
      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
        sinon.stub(MockSIMSlotManager,'hasOnlyOneSIMCardDetected')
          .returns(true);
      });

      teardown(function() {
        removeSimSlot();
      });

      test('sim1 is absent', function() {
        MockSIMSlotManager.mInstances[0].isAbsent = true;
        assert.isFalse(SimLock.isBothSlotsLocked());
      });

      test('sim2 is absent', function() {
        MockSIMSlotManager.mInstances[1].isAbsent = true;
        assert.isFalse(SimLock.isBothSlotsLocked());
      });
    });

    suite('Multisim handling', function() {
      var slot1 = new MockSIMSlot(null, 0);
      var slot2 = new MockSIMSlot(null, 1);

      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
        slot1 = MockSIMSlotManager.mInstances[0];
        slot2 = MockSIMSlotManager.mInstances[1];
        sinon.stub(MockSIMSlotManager,'hasOnlyOneSIMCardDetected')
          .returns(false);
      });

      teardown(function() {
        removeSimSlot();
      });

      test('both slots locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(true);
        this.sinon.stub(slot2, 'isLocked').returns(true);
        assert.isTrue(SimLock.isBothSlotsLocked());
      });

      test('sim1 is not locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(false);
        this.sinon.stub(slot2, 'isLocked').returns(true);
        assert.isFalse(SimLock.isBothSlotsLocked());
      });

      test('sim2 is not locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(true);
        this.sinon.stub(slot2, 'isLocked').returns(false);
        assert.isFalse(SimLock.isBothSlotsLocked());
      });

      test('both slots not locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(false);
        this.sinon.stub(slot2, 'isLocked').returns(false);
        assert.isFalse(SimLock.isBothSlotsLocked());
      });
    });
  });

  suite('showIfLocked', function() {
    setup(function() {
      SimLock.init();
      SimPinDialog.show.reset();
      SimPinDialog.visible = false;
    });

    teardown(function() {
    });

    test('should paint the first simslot on first render', function() {
      sinon.stub(SimLock, 'isBothSlotsLocked').returns(false);
      assert.isFalse(SimLock._alreadyShown);
      SimLock.showIfLocked();
      assert.isTrue(SimPinDialog.show.called);
      assert.isTrue(SimLock._alreadyShown);
    });


    test('should do nothing if !applications.ready', function() {
      sinon.stub(SimLock, 'isBothSlotsLocked').returns(false);
      window.applications.ready = false;
      SimLock.showIfLocked();
      assert.isFalse(SimPinDialog.show.called);
      window.applications.ready = true;
    });

    test('should not show if locked', function() {
      sinon.stub(SimLock, 'isBothSlotsLocked').returns(false);
      System.locked = true;
      SimLock.showIfLocked();
      assert.isFalse(SimPinDialog.show.called);
      System.locked = false;
    });

    test('should not show on Ftu', function() {
      sinon.stub(SimLock, 'isBothSlotsLocked').returns(false);
      sinon.stub(FtuLauncher, 'isFtuRunning').returns(true);
      sinon.stub(FtuLauncher, 'isFtuUpgrading').returns(false);
      SimLock.showIfLocked();
      assert.isFalse(SimPinDialog.show.called);
      FtuLauncher.isFtuUpgrading.restore();
      FtuLauncher.isFtuRunning.restore();
    });

    test('should not show during a call', function() {
      sinon.stub(SimLock, 'isBothSlotsLocked').returns(false);
      SimLock._duringCall = true;
      SimLock.showIfLocked();
      assert.isFalse(SimPinDialog.show.called);
      SimLock._duringCall = false;
    });

    suite('Multisim handling', function() {
      setup(function() {
        addSimSlot();
        sinon.stub(SimLock, 'isBothSlotsLocked').returns(true);
      });

      teardown(function() {
        removeSimSlot();
      });

      test('should not show the second dialog after first', function() {
        SimLock.showIfLocked();
        assert.equal(SimPinDialog.show.callCount, 1);
      });

      test('should not render if alreadyShown and not skipping', function() {
        SimLock.showIfLocked();
        SimLock.showIfLocked();
        assert.equal(SimPinDialog.show.callCount, 1);
      });

      test('should render if alreadyShown and skipping', function() {
        SimLock.showIfLocked();
        SimLock.showIfLocked(1, true);
        assert.equal(SimPinDialog.show.callCount, 2);
      });
    });

    suite('only second slot is locked', function() {
      function removeSIMLockForFirstSlot() {
        MockSIMSlotManager.mInstances[0].simCard.cardState = 'ready';
      }

      function restoreSIMLockForFirstSlot() {
        MockSIMSlotManager.mInstances[0].simCard.cardState = 'pinRequired';
      }

      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
        removeSIMLockForFirstSlot();
        SimLock._alreadyShown = false;
        this.sinon.stub(SimLock, 'isBothSlotsLocked').returns(false);
      });

      teardown(function() {
        removeSimSlot();
        restoreSIMLockForFirstSlot();
      });

      test('should show the second SIM if the first is not locked', function(){
        SimLock.showIfLocked();
        assert.equal(SimPinDialog.show.callCount, 1);
      });
    });
  });

  suite('lockscreen request to unlock', function() {
    var stubShowIfLocked;
    setup(function() {
      stubShowIfLocked = this.sinon.stub(SimLock, 'showIfLocked');
    });

    teardown(function() {
      SimPinDialog.visible = false;
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
      SimLock.handleEvent(requestUnlockEvent);
      assert.isFalse(stubShowIfLocked.called,
        'should not call showIfLocked');
    });


    test('when unlocking request comes, to check if it\'s for Camera, ' +
         'and SimPinDialog is visible',
      function() {
        var stubSimPinDialogClose = this.sinon.stub(SimPinDialog, 'close');
        SimPinDialog.visible = true;
        var requestUnlockEvent = {
          type: 'lockscreen-request-unlock',
          detail: {
            activity: {
              name: 'record'
            }
          }
        };
        SimLock.handleEvent(requestUnlockEvent);
        assert.isTrue(stubSimPinDialogClose.called,
          'should close SimPinDialog');
        assert.isFalse(stubShowIfLocked.called,
          'should not show the dialog');
      });

    test('unlock normally', function() {
      SimLock.handleEvent({
        type: 'lockscreen-request-unlock'
      });
      assert.isFalse(stubShowIfLocked.called,
        'should not call showIfLocked if app is not closed yet');
      window.dispatchEvent(new window.CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubShowIfLocked.called,
        'should call showIfLocked if app is closed');
    });

    test('callscreen window opening event', function() {
      SimLock.handleEvent(new CustomEvent('attentionopening', {
        detail: {
          CLASS_NAME: 'CallscreenWindow'
        }
      }));
      assert.isTrue(SimLock._duringCall);
    });


    test('callscreen window ending event', function() {
      SimLock.handleEvent(new CustomEvent('attentionterminated', {
        detail: {
          CLASS_NAME: 'CallscreenWindow'
        }
      }));
      assert.isFalse(SimLock._duringCall);
    });
  });
});
