/* global GeolocationIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/geolocation_icon.js');

suite('system/GeolocationIcon', function() {
  var subject, manager;

  setup(function() {
    this.sinon.useFakeTimers();
    manager = {
      isRecording: false
    };
    subject = new GeolocationIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
    subject.element.hidden = true;
    this.sinon.stub(subject, 'publish');
  });

  teardown(function() {
    subject.stop();
  });

  test('Geolocation is inactive', function() {
    manager.active = false;
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('Geolocation is active', function() {
    manager.active = true;
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.isFalse(subject.publish.calledWith('changed'));
  });

  test('Should hide after activated timeout', function() {
    manager.active = true;
    subject.update();
    assert.isFalse(subject.publish.calledWith('changed'));
    assert.isTrue(subject.isVisible());
    manager.active = false;
    subject.update();
    assert.isTrue(subject.publish.calledWith('changed'));
    assert.isTrue(subject.isVisible());
    this.sinon.clock.tick(subject.kActiveIndicatorTimeout);
    assert.isFalse(subject.isVisible());
  });
});
