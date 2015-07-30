/* global RecordingIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/recording_icon.js');

suite('system/RecordingIcon', function() {
  var subject, manager;

  setup(function() {
    this.sinon.useFakeTimers();
    manager = {
      isRecording: false
    };
    subject = new RecordingIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
    subject.element.hidden = true;
  });

  teardown(function() {
    subject.stop();
  });

  test('Recording is inactive', function() {
    manager.isRecording = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('Recording is active', function() {
    manager.isRecording = true;
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Should hide after activated timeout', function() {
    manager.isRecording = true;
    subject.update();
    assert.isTrue(subject.isVisible());
    manager.isRecording = false;
    subject.update();
    assert.isTrue(subject.isVisible());
    this.sinon.clock.tick(subject.kActiveIndicatorTimeout);
    assert.isFalse(subject.isVisible());
  });
});
