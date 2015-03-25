/* global TimeIcon, MockL10n, Service */
'use strict';


require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/clock.js');
requireApp('system/js/time_icon.js');

suite('system/TimeIcon', function() {
  var subject, manager, realMozL10n;

  setup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    manager = {
      _ampm: false,
      active: true
    };
    subject = new TimeIcon(manager);
    this.sinon.stub(Service, 'request');
    this.sinon.stub(subject, 'show');
    this.sinon.stub(subject, 'hide');
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realMozL10n;
    subject.stop();
  });

  suite('Time format', function() {
    test('should be 24 hour', function() {
      var timeFormat = subject._getTimeFormat('shortTimeFormat24');
      assert.equal(timeFormat, 'shortTimeFormat24');
    });

    test('should be 12 hour with AM/PM', function() {
      manager._ampm = true;

      var timeFormat = subject._getTimeFormat('123 %p');
      assert.equal(timeFormat, '123 <span>%p</span>');
    });

    test('should be 12 hour without AM/PM', function() {
      manager._ampm = false;

      var timeFormat = subject._getTimeFormat('123 %p');
      assert.equal(timeFormat, '123');
    });

    test('Should ask operator icon to update and publish changed', function() {
      this.sinon.stub(subject, 'publish');
      subject.update();
      assert.isTrue(Service.request.calledWith('OperatorIcon:update'));
      assert.isTrue(subject.publish.calledWith('changed'));
    });
  });
});