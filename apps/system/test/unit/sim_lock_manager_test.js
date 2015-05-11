/* global MocksHelper, Service, MockSimLockSystemDialog */
/* global MockSIMSlotManager, MockSIMSlot, BaseModule,
          MockService, MockApplications */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/test/unit/mock_simcard_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_version_helper.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_sim_lock_system_dialog.js');
requireApp('/system/shared/test/unit/mocks/mock_ftu_launcher.js');
requireApp('/shared/js/lazy_loader.js');
requireApp('system/js/base_module.js');
requireApp('system/js/sim_lock_manager.js');

var mocksHelperForSimLockManager = new MocksHelper([
  'Service',
  'SIMSlotManager'
]).init();

suite('SimLockManager', function() {
  var subject;
  var realMozL10n;
  mocksHelperForSimLockManager.attachTestHelpers();

  function addSimSlot() {
    MockSIMSlotManager.mInstances.push(new MockSIMSlot());
    var index = MockSIMSlotManager.mInstances.length - 1;
    MockSIMSlotManager.mInstances[index].simCard.cardState = 'pinRequired';
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
    window.applications = MockApplications;
    window.applications.ready = true;
    subject = BaseModule.instantiate('SimLockManager', {
      mobileConnections: []
    });
    subject.service = MockService;
    subject.start();
    subject.simLockSystemDialog = new MockSimLockSystemDialog();
    this.sinon.stub(subject.simLockSystemDialog, 'show', function() {
      subject.simLockSystemDialog.visible = true;
    });
  });

  teardown(function() {
    MockService.mTeardown();
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
      MockService.mUpgrading = false;
      MockService.runningFTU = true;
      window.dispatchEvent(new window.CustomEvent('ftuopen'));
      assert.isTrue(subject.simLockSystemDialog.close.called);
    });

    test('simpin dialog would show up on upgrade', function() {
      MockService.mUpgrading = true;
      MockService.runningFTU = true;
      window.dispatchEvent(new CustomEvent('ftuopen'));
      assert.isTrue(subject.simLockSystemDialog.show.called);
    });
  });

  suite('to test events', function() {
    var showIfLocked;

    setup(function() {
      this.sinon.stub(subject.simLockSystemDialog, 'close', function() {
        subject.simLockSystemDialog.visible = false;
      });
      showIfLocked = this.sinon.spy(subject, 'showIfLocked');
    });

    test('when unlocking request comes, to check if it\'s for Camera',
      function() {
        subject.handleEvent('lockscreen-request-unlock');
        assert.isFalse(subject.showIfLocked.called,
          'should not show the dialog');
      });

    test('Settings app is opened', function() {
      subject.simLockSystemDialog.visible = true;
      subject.handleEvent({
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
      assert.isTrue(subject.simLockSystemDialog.close.called);
      assert.isFalse(subject.simLockSystemDialog.visible);
    });

    test('when enabling airplane mode, the dialog gets closed', function() {
      subject.simLockSystemDialog.visible = true;
      subject.handleEvent({
        type: 'airplanemode-enabled'
      });
      assert.isTrue(subject.simLockSystemDialog.close.called);
      assert.isFalse(subject.simLockSystemDialog.visible);
    });

    test('when enabling the rocketbar, the dialog gets closed', function() {
      subject.simLockSystemDialog.visible = true;
      subject.handleEvent({
        type: 'rocketbar-activating'
      });
      assert.isTrue(subject.simLockSystemDialog.close.called);
      assert.isFalse(subject.simLockSystemDialog.visible);
    });

    suite('simslot-updated events', function() {

      setup(function() {
        subject.handleEvent({
          type: 'simslot-updated',
          detail: {
            index: 0
          }
        });
      });

      test('show the dialog if is locked', function() {
        assert.isTrue(showIfLocked.called);
      });
    });

    suite('simslot-cardstatechange events', function() {
      var slot1, slot2;

      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
        slot1 = MockSIMSlotManager.mInstances[0];
        slot2 = MockSIMSlotManager.mInstances[1];
        subject.simLockSystemDialog.visible = false;
      });

      test('receiving cardstate from sim2 before 1, both locked', function() {
        slot1.simCard.cardState = 'pinRequired';
        slot2.simCard.cardState = 'pinRequired';
        slot1.locked = true;
        slot2.locked = true;
        triggerCardStateEvent(1);
        assert.isFalse(subject.simLockSystemDialog.show.called);
        assert.isFalse(subject.simLockSystemDialog.visible);
      });

      test('receiving cardstate from sim2 before 1, 1 unknown', function() {
        slot1.simCard.cardState = 'unknown';
        slot2.simCard.cardState = 'pinRequired';
        slot1.locked = false;
        slot2.locked = true;
        triggerCardStateEvent(1);
        assert.isFalse(subject.simLockSystemDialog.show.called);
        assert.isFalse(subject.simLockSystemDialog.visible);
      });

      test('receiving cardstate from sim2 before 1, 1 empty', function() {
        slot1.simCard.cardState = '';
        slot2.simCard.cardState = 'pinRequired';
        slot1.locked = false;
        slot2.locked = true;
        triggerCardStateEvent(1);
        assert.isFalse(subject.simLockSystemDialog.show.called);
        assert.isFalse(subject.simLockSystemDialog.visible);
      });

      test('receiving cardstate from sim2 before 1, 1 null', function() {
        slot1.simCard.cardState = null;
        slot2.simCard.cardState = 'pinRequired';
        slot1.locked = false;
        slot2.locked = true;
        triggerCardStateEvent(1);
        assert.isFalse(subject.simLockSystemDialog.show.called);
        assert.isFalse(subject.simLockSystemDialog.visible);
      });

      test('receiving cardstate from sim2 before 1, only 2 locked', function() {
        slot1.simCard.cardState = 'ready';
        slot2.simCard.cardState = 'pinRequired';
        slot1.locked = false;
        slot2.locked = true;
        triggerCardStateEvent(1);
        assert.isTrue(subject.simLockSystemDialog.show.calledWith(slot2));
        assert.isTrue(subject.simLockSystemDialog.visible);
      });

      test('receiving cardstate from sim2 and only 1 sim', function() {
        this.sinon.stub(MockSIMSlotManager,
          'hasOnlyOneSIMCardDetected').returns(true);
        MockSIMSlotManager.mInstances[0] = null;
        slot2.simCard.cardState = 'pinRequired';
        slot2.locked = true;
        triggerCardStateEvent(1);
        assert.isTrue(subject.simLockSystemDialog.show.calledWith(slot2));
        assert.isTrue(subject.simLockSystemDialog.visible);
      });
    });

    function triggerCardStateEvent(index) {
      subject.handleEvent({
        type: 'simslot-cardstatechange',
        detail: {
          index: index
        }
      });
    }

  });

  suite('isBothSlotsLocked', function() {
    setup(function() {
      MockSIMSlotManager.ready = true;
    });

    teardown(function() {
    });

    test('is not multisim', function() {
      assert.isFalse(subject.isBothSlotsLocked());
    });

    suite('only one sim detected', function() {
      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
      });

      teardown(function() {
        removeSimSlot();
      });

      test('sim1 is absent', function() {
        MockSIMSlotManager.mInstances[0].isAbsent = true;
        this.sinon.stub(MockSIMSlotManager,
          'hasOnlyOneSIMCardDetected').returns(true);
        assert.isFalse(subject.isBothSlotsLocked());
      });

      test('sim2 is absent', function() {
        MockSIMSlotManager.mInstances[1].isAbsent = true;
        this.sinon.stub(MockSIMSlotManager,
          'hasOnlyOneSIMCardDetected').returns(true);
        assert.isFalse(subject.isBothSlotsLocked());
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
      });

      teardown(function() {
        removeSimSlot();
      });

      test('both slots locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(true);
        this.sinon.stub(slot2, 'isLocked').returns(true);
        assert.isTrue(subject.isBothSlotsLocked());
      });

      test('sim1 is unknown', function() {
        this.sinon.stub(slot1, 'isLocked').returns(false);
        this.sinon.stub(slot1, 'getCardState').returns('unknown');
        this.sinon.stub(slot2, 'isLocked').returns(true);
        assert.isTrue(subject.isBothSlotsLocked());
      });

      test('sim1 is not locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(false);
        this.sinon.stub(slot2, 'isLocked').returns(true);
        assert.isFalse(subject.isBothSlotsLocked());
      });

      test('sim2 is not locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(true);
        this.sinon.stub(slot2, 'isLocked').returns(false);
        assert.isFalse(subject.isBothSlotsLocked());
      });

      test('both slots not locked', function() {
        this.sinon.stub(slot1, 'isLocked').returns(false);
        this.sinon.stub(slot2, 'isLocked').returns(false);
        assert.isFalse(subject.isBothSlotsLocked());
      });
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
      this.sinon.stub(subject, 'isBothSlotsLocked').returns(true);
      assert.isFalse(subject._alreadyShown);
      subject.showIfLocked();
      assert.isTrue(subject.simLockSystemDialog.show.called);
      subject.showIfLocked();
      assert.isTrue(subject.simLockSystemDialog.show.calledOnce);
      assert.isFalse(subject.simLockSystemDialog.show.calledTwice);
    });

    test('should do nothing if !applications.ready', function() {
      window.applications.ready = false;
      this.sinon.stub(subject, 'isBothSlotsLocked').returns(true);
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
      window.applications.ready = true;
    });

    test('should not show if locked', function() {
      Service.locked = true;
      this.sinon.stub(subject, 'isBothSlotsLocked').returns(true);
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
      Service.locked = false;
    });

    test('should not show on Ftu', function() {
      MockService.mUpgrading = false;
      MockService.runningFTU = true;
      this.sinon.stub(subject, 'isBothSlotsLocked').returns(true);
      subject.showIfLocked();
      assert.isFalse(subject.simLockSystemDialog.show.called);
    });

    suite('Multisim handling', function() {
      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
        this.sinon.stub(subject, 'isBothSlotsLocked').returns(true);
      });

      teardown(function() {
        removeSimSlot();
      });

      test('should not show the second dialog after first', function() {
        subject.showIfLocked();
        assert.equal(subject.simLockSystemDialog.show.callCount, 1);
      });

      test('should show always the first SIM before the second', function() {
        subject.showIfLocked(1);
        assert.equal(subject.simLockSystemDialog.show.callCount, 0);
      });

      test('should show the second SIM only after the first one', function() {
        subject._alreadyShown = true;
        subject.showIfLocked(1);
        assert.equal(subject.simLockSystemDialog.show.callCount, 1);
        subject._alreadyShown = false;
      });

      test('should not render if alreadyShown and not skipping', function() {
        subject.showIfLocked();
        subject.showIfLocked();
        assert.equal(subject.simLockSystemDialog.show.callCount, 1);
      });

      test('should render the second dialog if the first is skipping',
        function() {
          subject.showIfLocked();
          assert.isTrue(subject.simLockSystemDialog.visible);
          subject.showIfLocked(1, true);
          assert.equal(subject.simLockSystemDialog.show.callCount, 2);
      });

      test('should render the first dialog if the user goes back',
        function() {
          subject._alreadyShown = true;
          subject.showIfLocked(1, true);
          assert.isTrue(subject.simLockSystemDialog.visible);
          subject.showIfLocked(0, false);
          assert.equal(subject.simLockSystemDialog.show.callCount, 2);
          subject._alreadyShown = false;
      });
    });

    suite('SIM second slot handling', function() {
      var mockSIMCard;
      function removeSIMCardFromFirstSlot() {
        mockSIMCard = MockSIMSlotManager.mInstances[0].simCard;
        delete MockSIMSlotManager.mInstances[0].simCard;
        MockSIMSlotManager.mInstances[0].isAbsent = true;
      }

      function restoreSIMCardFirstSlot() {
        MockSIMSlotManager.mInstances[0].simCard = mockSIMCard;
        MockSIMSlotManager.mInstances[0].isAbsent = false;
      }
      setup(function() {
        MockSIMSlotManager.ready = true;
        addSimSlot();
        removeSIMCardFromFirstSlot();
        subject._alreadyShown = false;
        this.sinon.stub(subject, 'isBothSlotsLocked').returns(false);
      });

      teardown(function() {
        removeSimSlot();
        restoreSIMCardFirstSlot();
      });

      test('should show the second SIM if the first is not inserted',
        function() {
          subject.showIfLocked();
          assert.equal(subject.simLockSystemDialog.show.callCount, 1);
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
        subject._alreadyShown = false;
        this.sinon.stub(subject, 'isBothSlotsLocked').returns(false);
      });

      teardown(function() {
        removeSimSlot();
        restoreSIMLockForFirstSlot();
      });

      test('should show the second SIM if the first is not locked',
        function() {
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
