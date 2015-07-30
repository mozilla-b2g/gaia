/* global DebuggingIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/debugging_icon.js');

suite('system/DebuggingIcon', function() {
  var subject, manager;

  setup(function() {
    manager = {
      enabled: false
    };
    subject = new DebuggingIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Debugging is enabled', function() {
    manager.enabled = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Debugging is disabled', function() {
    manager.enabled = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
