/* global CallForwardingsIcon, MocksHelper, MockCallForwarding,
          MockSIMSlot, MockNavigatorMozMobileConnection, MockSIMSlotManager */
'use strict';


requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/call_forwarding_icon.js');
requireApp('system/test/unit/mock_call_forwarding.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');

var mocksForCallForwardingsIcon = new MocksHelper([
  'SIMSlotManager'
]).init();

suite('system/CallForwardingsIcon', function() {
  var subject;

  mocksForCallForwardingsIcon.attachTestHelpers();

  setup(function() {
    this.sinon.stub(document, 'getElementById').returns(
      document.createElement('div'));
    MockSIMSlotManager.mInstances = [
      new MockSIMSlot(MockNavigatorMozMobileConnection, 0),
      new MockSIMSlot(MockNavigatorMozMobileConnection, 1)
    ];
    subject = new CallForwardingsIcon(MockCallForwarding);
    subject.start();
    subject.element = document.createElement('div');
    subject.onrender();
  });

  teardown(function() {
    subject.stop();
  });

  test('Enable call forwarding on 1st SIM slot', function() {
    this.sinon.stub(MockCallForwarding, 'enabled', function(index) {
      return index === 0 ? true : false;
    });
    subject.update();
    assert.isTrue(subject.icons[0].isVisible());
    assert.isFalse(subject.icons[1].isVisible());
    assert.isTrue(subject.isVisible());
  });

  test('Enable call forwarding on 2nd SIM slot', function() {
    this.sinon.stub(MockCallForwarding, 'enabled', function(index) {
      return index === 0 ? false : true;
    });
    subject.update();
    assert.isFalse(subject.icons[0].isVisible());
    assert.isTrue(subject.icons[1].isVisible());
    assert.isTrue(subject.isVisible());
  });

  test('Enable call forwarding on both SIM slots', function() {
    this.sinon.stub(MockCallForwarding, 'enabled', function() {
      return true;
    });
    subject.update();
    assert.isTrue(subject.icons[0].isVisible());
    assert.isTrue(subject.icons[1].isVisible());
    assert.isTrue(subject.isVisible());
  });

  test('Disable call forwarding on both SIM slots', function() {
    this.sinon.stub(MockCallForwarding, 'enabled', function() {
      return false;
    });
    subject.update();
    assert.isFalse(subject.icons[0].isVisible());
    assert.isFalse(subject.icons[1].isVisible());
    assert.isFalse(subject.isVisible());
  });
});
