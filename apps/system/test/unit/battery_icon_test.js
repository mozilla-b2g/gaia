/* global BatteryIcon, MockBattery, MockL10n */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/battery_icon.js');
require('/shared/test/unit/mocks/mock_navigator_getbattery.js');
require('/shared/test/unit/mocks/mock_l20n.js');

suite('system/BatteryIcon', function() {
  var subject, realMozL10n;

  setup(function() {
    realMozL10n = document.l10n;
    document.l10n = MockL10n;
    MockBattery._battery.level = 0.95;
    MockBattery._battery.charging = false;
    subject = new BatteryIcon({
      _battery: MockBattery._battery 
    });
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    document.l10n = realMozL10n;
    subject.stop();
  });

  test('should not publish changed when there is no change', function() {
    subject.update();
    this.sinon.stub(subject, 'publish');
    subject.update();
    assert.isFalse(subject.publish.calledWith('changed'));
  });

  test('should not publish iconchange when computed level does not change',
    function() {
      subject.update();
      MockBattery._battery.level = 0.95;
      this.sinon.stub(subject, 'publish');
      subject.update();

      assert.isFalse(subject.publish.calledWith('changed'));
    });

  test('should publish iconchange when battery changes', function() {
    subject.update();
    MockBattery._battery.level = 0.5;
    this.sinon.stub(subject, 'publish');
    subject.update();

    assert.isTrue(subject.publish.calledWith('changed'));
  });

  test('should publish iconchange when charging state changes', function() {
    subject.update();
    MockBattery._battery.charging = true;
    this.sinon.stub(subject, 'publish');
    subject.update();

    assert.isTrue(subject.publish.calledWith('changed'));
  });
});
