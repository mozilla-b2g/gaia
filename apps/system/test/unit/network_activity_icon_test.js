/* global NetworkActivityIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/network_activity_icon.js');

suite('system/NetworkActivityIcon', function() {
  var subject, manager;

  setup(function() {
    this.sinon.useFakeTimers();
    manager = {
      isRecording: false
    };
    subject = new NetworkActivityIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
    subject.element.hidden = true;
  });

  teardown(function() {
    subject.stop();
  });

  test('Network activity is inactive', function() {
    assert.isFalse(subject.isVisible());
  });

  test('Network activity is active', function() {
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Should hide after activated timeout', function() {
    subject.update();
    assert.isTrue(subject.isVisible());
    this.sinon.clock.tick(subject.kActiveIndicatorTimeout);
    assert.isFalse(subject.isVisible());
  });
});
