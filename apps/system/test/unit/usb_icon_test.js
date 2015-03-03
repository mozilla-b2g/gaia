/* global UsbIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/usb_icon.js');

suite('system/UsbIcon', function() {
  var subject, manager;

  setup(function() {
    manager = {
      umsActive: false
    };
    subject = new UsbIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('USB storage is deactivated', function() {
    manager.umsActive = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('USB storage is activated', function() {
    manager.umsActive = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });
});
