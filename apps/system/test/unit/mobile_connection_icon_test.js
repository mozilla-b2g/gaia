/* global MobileConnectionIcon, MockRadio, MocksHelper, MockL10n, Service,
          MockSIMSlot, MockNavigatorMozMobileConnection, MockSIMSlotManager */
'use strict';


requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/mobile_connection_icon.js');
requireApp('system/js/signal_icon.js');
requireApp('system/js/roaming_icon.js');
requireApp('system/test/unit/mock_radio.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForMobileConnectionIcon = new MocksHelper([
  'SIMSlotManager',
  'Service'
]).init();

suite('system/MobileConnectionIcon', function() {
  var subject;
  var realL10n;

  mocksForMobileConnectionIcon.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.sinon.stub(Service, 'request', function() {
      var container = document.createElement('div');
      return {
        then: function(callback) {
          callback(container);
        }
      };
    });
    this.sinon.stub(document, 'getElementById', function() {
      var ele = document.createElement('div');
      this.sinon.stub(ele, 'querySelector')
          .returns(document.createElement('div'));
      return ele;
    }.bind(this));
    MockSIMSlotManager.mInstances = [
      new MockSIMSlot(MockNavigatorMozMobileConnection, 0),
      new MockSIMSlot(MockNavigatorMozMobileConnection, 1)
    ];
    subject = new MobileConnectionIcon(MockRadio);
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('Update', function() {
    test('Init', function() {
      assert.isTrue(subject.roamings.length === 2);
      assert.isTrue(subject.signals.length === 2);
    });

    test('Update should update all sub icons', function() {
      this.sinon.stub(subject.roamings[0], 'update');
      this.sinon.stub(subject.roamings[1], 'update');
      this.sinon.stub(subject.signals[0], 'update');
      this.sinon.stub(subject.signals[1], 'update');
      subject.update();
      assert.isTrue(subject.roamings[0].update.called);
      assert.isTrue(subject.roamings[1].update.called);
      assert.isTrue(subject.signals[0].update.called);
      assert.isTrue(subject.signals[1].update.called);
    });

    test('Update specific icon', function() {
      this.sinon.stub(subject.roamings[0], 'update');
      this.sinon.stub(subject.roamings[1], 'update');
      this.sinon.stub(subject.signals[0], 'update');
      this.sinon.stub(subject.signals[1], 'update');
      subject.update(1);
      assert.isFalse(subject.roamings[0].update.called);
      assert.isTrue(subject.roamings[1].update.called);
      assert.isFalse(subject.signals[0].update.called);
      assert.isTrue(subject.signals[1].update.called);
    });
  });

  suite('Single SIM', function() {
    var secondSIM;
    setup(function() {
      secondSIM = MockSIMSlotManager.mInstances.pop();
    });
    teardown(function() {
      MockSIMSlotManager.mInstances.push(secondSIM);
    });
    test('Should set multiple to false on rendering', function() {
      subject.onrender();
      assert.equal(subject.element.dataset.multiple, 'false');
    });

    test('mutliple is still false if sim is absent', function() {
      subject.onrender();
      this.sinon.stub(MockSIMSlotManager.mInstances[0], 'isAbsent')
          .returns(true);
      subject.updateVisibility();
      assert.equal(subject.element.dataset.multiple, 'false');
    });

    test('mutliple is still false if sim is not absent', function() {
      subject.onrender();
      this.sinon.stub(MockSIMSlotManager.mInstances[0], 'isAbsent')
          .returns(false);
      subject.updateVisibility();
      assert.equal(subject.element.dataset.multiple, 'false');
    });
  });

  suite('Multiple update', function() {
    test('multiple is set to true if any active sim', function() {
      this.sinon.stub(MockSIMSlotManager.mInstances[0], 'isAbsent')
          .returns(true);
      this.sinon.stub(MockSIMSlotManager.mInstances[1], 'isAbsent')
          .returns(false);
      subject.updateVisibility();
      assert.equal(subject.element.dataset.multiple, 'true');
    });

    test('multiple is set to false if no SIM insterted', function() {
      this.sinon.stub(subject.signals[0], 'show');
      this.sinon.stub(MockSIMSlotManager.mInstances[0], 'isAbsent')
          .returns(true);
      this.sinon.stub(MockSIMSlotManager.mInstances[1], 'isAbsent')
          .returns(true);
      subject.updateVisibility();
      assert.equal(subject.element.dataset.multiple, 'false');
      assert.isTrue(subject.signals[0].show.calledWith(true));
    });
  });
});
