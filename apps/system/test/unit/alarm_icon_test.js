/* global AlarmIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/alarm_icon.js');

suite('system/AlarmIcon', function() {
  var subject, manager;

  setup(function() {
    manager = {
      enabled: false
    };
    subject = new AlarmIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Alarm is enabled', function() {
    manager.enabled = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Alarm is disabled', function() {
    manager.enabled = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
