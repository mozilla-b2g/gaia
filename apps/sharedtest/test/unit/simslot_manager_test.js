/* globals MockIccManager, MockNavigatorMozMobileConnections, MocksHelper,
           MockSIMSlot, SIMSlotManager */
'use strict';

require('/shared/test/unit/mocks/mock_simslot.js');
require('/shared/test/unit/mocks/mock_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

var mocksForSIMSlotManager = new MocksHelper([
  'SIMSlot', 'NavigatorMozMobileConnections'
]).init();

suite('SIMSlotManager', function() {
  var realIccManager = navigator.mozIccManager;
  var realMobileConnections = navigator.mozMobileConnections;
  mocksForSIMSlotManager.attachTestHelpers();

  setup(function(callback) {
    navigator.mozIccManager = MockIccManager;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    require('/shared/js/simslot_manager.js', callback);
  });

  teardown(function() {
    MockNavigatorMozMobileConnections.mTeardown();
    navigator.mozIccManager = realIccManager;
    navigator.mozMobileConnections = realMobileConnections;
  });

  test('Multi-SIM with 1st slot ready and 2nd slot absent.', function() {
    // Add 2nd MobileConnection for Multi-SIM scenario.
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    var stubAddEventListener = this.sinon.stub(
      MockIccManager, 'addEventListener');

    // Have 1st slot ready to test.
    MockNavigatorMozMobileConnections[0].iccId = 0;
    MockIccManager.iccIds = [0];
    var getIccById = MockIccManager.getIccById;
    MockIccManager.getIccById = function(iccId) {
      return (iccId !== 0) ? null : {
        cardState: 'ready',
        iccInfo: { iccid: 0 }
      };
    };

    // Reset SIMSlotManager before testing.
    SIMSlotManager.length = 0;
    SIMSlotManager._instances = [];
    SIMSlotManager.ready = false;

    // Start the test.
    SIMSlotManager.init();

    // Verdict.
    assert.isTrue(SIMSlotManager.isMultiSIM());
    assert.equal(SIMSlotManager.length,
      MockNavigatorMozMobileConnections.length);
    assert.isFalse(SIMSlotManager.ready);
    assert.isTrue(
      stubAddEventListener.calledWith('iccdetected', SIMSlotManager));

    // Reset MockIccManager.getIccById.
    MockIccManager.getIccById = getIccById;
  });

  test('Multi-SIM with 2 slots ready.', function() {
    // Add 2nd MobileConnection for Multi-SIM scenario.
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    var stubAddEventListener = this.sinon.stub(
      MockIccManager, 'addEventListener');

    // Reset SIMSlotManager before testing.
    SIMSlotManager.length = 0;
    SIMSlotManager._instances = [];
    SIMSlotManager.ready = false;

    // Start the test.
    SIMSlotManager.init();

    // Verdict.
    assert.isTrue(SIMSlotManager.isMultiSIM());
    assert.equal(SIMSlotManager.length,
      MockNavigatorMozMobileConnections.length);
    assert.isTrue(SIMSlotManager.ready);
    assert.isTrue(
      stubAddEventListener.calledWith('iccdetected', SIMSlotManager));
  });

  test('get current SIM count', function() {
    MockIccManager.iccIds = [0, 1, 2];
    assert.isFalse(SIMSlotManager.noSIMCardOnDevice());
    MockIccManager.iccIds = [];
    assert.isTrue(SIMSlotManager.noSIMCardOnDevice());
  });

  test('noSIMCardConnectedToNetwork', function() {
    MockIccManager.iccIds = [0, 1];
    MockNavigatorMozMobileConnections.mAddMobileConnection();

    SIMSlotManager._instances = [];
    SIMSlotManager.init();
    MockNavigatorMozMobileConnections[0].voice = { emergencyCallsOnly: true };
    MockNavigatorMozMobileConnections[1].voice = { emergencyCallsOnly: true };
    assert.isTrue(SIMSlotManager.noSIMCardConnectedToNetwork());
    MockNavigatorMozMobileConnections[0].voice.emergencyCallsOnly = false;
    assert.isFalse(SIMSlotManager.noSIMCardConnectedToNetwork());
  });

  test('getSlotByIccId', function() {
    var card1 = document.createElement('div');
    card1.iccId = 1;
    var card2 = document.createElement('div');
    card2.iccId = 2;
    var slot1 = new MockSIMSlot({ iccId: 1 }, 0, card1);
    var slot2 = new MockSIMSlot({ iccId: 2 }, 1, card2);
    var slot3 = new MockSIMSlot({ iccId: null}, 2);

    SIMSlotManager._instances = [slot1, slot2, slot3];
    assert.deepEqual(SIMSlotManager.getSlotByIccId(1), slot1);

    assert.deepEqual(SIMSlotManager.getSlotByIccId(2), slot2);

    assert.deepEqual(SIMSlotManager.getSlotByIccId(9999), null);
  });

  test('iccdetected', function() {
    var stubGetIccById = this.sinon.stub(SIMSlotManager, 'getSlotByIccId');
    var card1 = document.createElement('div');
    card1.iccId = 1;
    var slot = new MockSIMSlot(null, 1, card1);
    var stubUpdate = this.sinon.stub(slot, 'update');
    var card2 = document.createElement('div');
    card2.iccId = 1;
    var stubGetIccByIdOfIccManager =
      this.sinon.stub(MockIccManager, 'getIccById');
    stubGetIccByIdOfIccManager.returns(card2);
    stubGetIccById.returns(slot);
    SIMSlotManager.handleEvent({
      type: 'iccdetected',
      iccId: 1
    });
    assert.isTrue(stubGetIccById.calledWith(1));
    assert.isTrue(stubUpdate.calledWith(card2));
    assert.isTrue(SIMSlotManager.ready);
  });
});
