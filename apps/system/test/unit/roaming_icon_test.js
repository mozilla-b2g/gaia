/* global RoamingIcon, MocksHelper, MockService,
          MockL10n, MockSIMSlot, MockNavigatorMozMobileConnection */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/roaming_icon.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForRoamingIcon = new MocksHelper([
  'Service'
]).init();

suite('system/RoamingIcon', function() {
  var subject;
  var realL10n;

  mocksForRoamingIcon.attachTestHelpers();

  setup(function() {
    MockService.mockQueryWith('hasActiveCall', false);
    MockService.mockQueryWith('Radio.settingEnabled', true);
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.stub(document, 'getElementById', function() {
      var ele = document.createElement('div');
      this.sinon.stub(ele, 'querySelector')
          .returns(document.createElement('div'));
      return ele;
    }.bind(this));
    subject = new RoamingIcon(
      new MockSIMSlot(MockNavigatorMozMobileConnection, 0), 0);
    subject.start();
    subject.manager.conn.voice = {
      connected: false,
      roaming: false
    };
    subject.manager.conn.data = {
      connected: false,
      roaming: false
    };
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  test('SIM card is absent', function() {
    MockService.mockQueryWith('Radio.settingEnabled', true);
    this.sinon.stub(subject, 'hide');
    this.sinon.stub(subject.manager, 'isAbsent').returns(true);
    subject.update();
    assert.isTrue(subject.hide.called);
  });

  test('Radio is disabled', function() {
    MockService.mockQueryWith('Radio.settingEnabled', false);
    this.sinon.stub(subject, 'hide');
    subject.update();
    assert.isTrue(subject.hide.called);
  });

  test('Voice is connected', function() {
    subject.manager.conn.voice = {
      connected: true,
      roaming: true
    };
    this.sinon.stub(subject, 'show');
    subject.update();
    assert.isTrue(subject.show.called);
  });

  test('Active call at this sim card', function() {
    MockService.mockQueryWith('hasActiveCall', true);
    subject.manager.conn.voice = {
      connected: false,
      roaming: true
    };
    this.sinon.stub(subject, 'show');
    subject.update();
    assert.isTrue(subject.show.called);
  });

  test('SIM slot is locked', function() {
    this.sinon.stub(subject.manager, 'isLocked').returns(true);
    this.sinon.stub(subject, 'hide');
    subject.update();
    assert.isTrue(subject.hide.called);
  });

  test('Data is connected', function() {
    subject.manager.conn.data = {
      connected: true,
      roaming: true,
      type: 'evdo'
    };
    this.sinon.stub(subject, 'show');
    subject.update();
    assert.isTrue(subject.show.called);
  });

  test('Data is dropped', function() {
    subject.manager.conn.data = {
      connected: true,
      roaming: true
    };
    this.sinon.stub(subject, 'hide');
    subject.update();
    assert.isTrue(subject.hide.called);
  });

  test('emergency calls, roaming', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: 80,
      emergencyCallsOnly: true,
      state: 'notSearching',
      roaming: true,
      network: {}
    };

    subject.manager.simCard.cardState = 'ready';
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(false);

    subject.update();

    assert.isFalse(subject.isVisible());
  });
});
