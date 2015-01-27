/* global EmergencyCallbackIcon, MockEmergencyCallbackManager */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/emergency_callback_icon.js');
requireApp('system/test/unit/mock_emergency_callback_manager.js');

suite('system/EmergencyCallbackIcon', function() {
  var subject;

  setup(function() {
    subject = new EmergencyCallbackIcon(MockEmergencyCallbackManager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Emergency callback is deactivated', function() {
    MockEmergencyCallbackManager.active = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('Emergency callback is activated', function() {
    MockEmergencyCallbackManager.active = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });
});
