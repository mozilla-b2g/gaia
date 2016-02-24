/* global BatteryIcon, MockNavigatorBattery, MockL10n */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/battery_icon.js');
requireApp('system/test/unit/mock_navigator_battery.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('system/BatteryIcon', function() {
  var subject, realMozL10n;

  setup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    MockNavigatorBattery.level = 0.95;
    MockNavigatorBattery.charging = false;
    subject = new BatteryIcon({
      _battery: MockNavigatorBattery
    });
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realMozL10n;
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
      MockNavigatorBattery.level = 0.95;
      this.sinon.stub(subject, 'publish');
      subject.update();

      assert.isFalse(subject.publish.calledWith('changed'));
    });

  test('should publish iconchange when battery changes', function() {
    subject.update();
    MockNavigatorBattery.level = 0.5;
    this.sinon.stub(subject, 'publish');
    subject.update();

    assert.isTrue(subject.publish.calledWith('changed'));
  });

  test('should publish iconchange when charging state changes', function() {
    subject.update();
    MockNavigatorBattery.charging = true;
    this.sinon.stub(subject, 'publish');
    subject.update();

    assert.isTrue(subject.publish.calledWith('changed'));
  });
});