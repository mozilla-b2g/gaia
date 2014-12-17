'use strict';
/* global MockNavigatorMozMobileConnections, BaseModule */

requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/emergency_callback_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('system/emergency_callback_manager', function() {
  var subject;
  suiteSetup(function() {
    loadBodyHTML('/index.html');
  });

  setup(function() {
    subject = BaseModule.instantiate('EmergencyCallbackManager',
      {
        mobileConnections: MockNavigatorMozMobileConnections
      });
  });

  teardown(function() {
    subject.stop();
  });

  suite('EmergencyCbManager init', function() {
    test('emergencycbmodechange registed while connections exists', function() {
      MockNavigatorMozMobileConnections[0].addEventListener =
        this.sinon.stub();
      subject.start();
      assert.ok(subject.notification);
      assert.ok(subject.message);
      assert.ok(subject.toaster);
      assert.ok(subject.toasterMessage);
      assert.ok(subject.okButton);
      assert.ok(subject.cancelButton);
      assert.ok(subject.cancelButton);
      sinon.assert.called(
        MockNavigatorMozMobileConnections[0].addEventListener);
    });
  });

  suite('onEmergencyCbModeChange', function() {
    setup(function() {
      subject.publish = this.sinon.stub();
      this.sinon.useFakeTimers();
      subject.start();
    });

    test('EmergencyCbMode changes to active with 1 min duration', function() {
      subject.onEmergencyCbModeChange({
        active: true,
        timeoutMs: 60 * 1000
      });

      assert.equal(subject.timer, 60 * 1000);
      assert.ok(subject.timeoutController);
      assert.ok(subject._conn.ondataerror);
      assert.isTrue(subject.notification.classList.contains('displayed'));
      assert.isTrue(subject.toaster.classList.contains('displayed'));

      // Toaster should hide after timeout
      this.sinon.clock.tick(subject.TOASTER_TIMEOUT + 1);
      assert.isFalse(subject.toaster.classList.contains('displayed'));

      // clear timeoutController after 1 min
      this.sinon.clock.tick(60 * 1000);
      assert.isNull(subject.timeoutController);
    });

    test('EmergencyCbMode changes to inactive', function() {
      subject.onEmergencyCbModeChange({ active: false });
      assert.isFalse(subject.warningDialog.classList.contains('visible'));
      assert.isTrue(subject.warningDialog.hidden);
      assert.isNull(subject.timeoutController);
      assert.isNull(subject._conn.ondataerror);
      assert.isFalse(subject.notification.classList.contains('displayed'));
    });
  });
});
