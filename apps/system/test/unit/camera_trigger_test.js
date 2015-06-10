/* global MocksHelper, BaseModule */
'use strict';

require('/js/service.js');
require('/js/base_module.js');
require('/js/camera_trigger.js');
require('/test/unit/mock_activity.js');

var mocksForCameraTrigger = new MocksHelper([
  'MozActivity'
]).init();

suite('system/CameraTrigger', function() {
  var subject;
  mocksForCameraTrigger.attachTestHelpers();

  setup(function() {
    subject = BaseModule.instantiate('CameraTrigger');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('Launch Camera', function() {
    var activitySpy;
    var expectedActivity = {
      name: 'record',
      data: {
        type: 'photos'
      }
    };

    setup(function() {
      activitySpy = this.sinon.spy(window, 'MozActivity');
    });

    test('holdcamera triggers MozActivity', function() {
      window.dispatchEvent(new CustomEvent('holdcamera', {}));
      sinon.assert.calledWith(activitySpy, expectedActivity);
    });
  });
});
