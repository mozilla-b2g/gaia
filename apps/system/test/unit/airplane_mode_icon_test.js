/* global AirplaneModeIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/airplane_mode_icon.js');

suite('system/AirplaneModeIcon', function() {
  var subject, manager;

  setup(function() {
    manager = {
      enabled: false
    };
    subject = new AirplaneModeIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('AirplaneMode is deactivated', function() {
    manager.enabled = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('AirplaneMode is activated', function() {
    manager.enabled = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });
});
