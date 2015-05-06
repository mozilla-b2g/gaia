/* global HeadphoneIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/headphone_icon.js');

suite('system/HeadphoneIcon', function() {
  var subject;
  var manager = {
    isHeadsetConnected: false
  };

  setup(function() {
    subject = new HeadphoneIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Headset connected', function() {
    manager.isHeadsetConnected = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Headset disconnected', function() {
    manager.isHeadsetConnected = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
