/* global TimeIcon, MockService */
'use strict';


requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/clock.js');
requireApp('system/js/time_icon.js');

suite('system/TimeIcon', function() {
  var subject, manager, realService;

  setup(function() {
    realService = window.Service;
    window.Service = MockService;
    manager = {
      _ampm: false,
      active: true
    };
    subject = new TimeIcon(manager);
    this.sinon.stub(subject, 'show');
    this.sinon.stub(subject, 'hide');
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  suite('Time format', function() {
    test('should be 24 hour', function() {
      navigator.mozHour12 = false;
      subject._start();

      var timeFormat = subject.timeFormatter.resolvedOptions().hour12;
      assert.isFalse(timeFormat);
    });

    test('should be 12 hour with AM/PM', function() {
      manager._ampm = true;
      navigator.mozHour12 = true;
      subject._start();

      var timeFormat = subject.timeFormatter.resolvedOptions().hour12;
      assert.isTrue(timeFormat);

      var amPm = (new Date()).toLocaleFormat('%p');

      assert.notEqual(subject.element.innerHTML.indexOf(amPm), -1);
    });

    test('should be 12 hour without AM/PM', function() {
      manager._ampm = false;
      navigator.mozHour12 = true;
      subject._start();

      var timeFormat = subject.timeFormatter.resolvedOptions().hour12;
      assert.isTrue(timeFormat);

      var amPm = (new Date()).toLocaleFormat('%p');

      assert.equal(subject.element.innerHTML.indexOf(amPm), -1);
    });

    test('Should ask operator icon to update and publish changed', function() {
      this.sinon.stub(subject, 'publish');
      this.sinon.stub(MockService, 'request');
      subject.update();
      assert.isTrue(MockService.request.calledWith('OperatorIcon:update'));
      assert.isTrue(subject.publish.calledWith('changed'));
    });
  });
});
