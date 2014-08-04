'use strict';
/* global MockNavigatorMozMobileConnections, StatusBar, MocksHelper,
          EmergencyCbManager */

requireApp('system/js/emergency_callback_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/load_body_html_helper.js');

var mocksForEmergencyCbManager = new MocksHelper([
  'StatusBar'
]).init();
var manager;

suite('system/emergency_callback_manager', function() {
  mocksForEmergencyCbManager.attachTestHelpers();
  suiteSetup(function() {
    manager = EmergencyCbManager;
    loadBodyHTML('/index.html');
  });

  suite('EmergencyCbManager init', function() {
    setup(function() {
      navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    });

    test('early exit while no connections', function() {
      navigator.mozMobileConnections = null;
      manager.init();
      assert.isNull(manager.notification);
      assert.isNull(manager.message);
      assert.isNull(manager.toaster);
      assert.isNull(manager.toasterMessage);
      assert.isNull(manager.okButton);
      assert.isNull(manager.cancelButton);
      assert.isNull(manager.cancelButton);
    });

    test('emergencycbmodechange registed while connections exists', function() {
      navigator.mozMobileConnections[0].addEventListener = this.sinon.stub();
      manager.init();
      assert.ok(manager.notification);
      assert.ok(manager.message);
      assert.ok(manager.toaster);
      assert.ok(manager.toasterMessage);
      assert.ok(manager.okButton);
      assert.ok(manager.cancelButton);
      assert.ok(manager.cancelButton);
      sinon.assert.called(navigator.mozMobileConnections[0].addEventListener);
    });
  });

  suite('onEmergencyCbModeChange', function() {
    setup(function() {
      StatusBar.updateEmergencyCbNotification = this.sinon.stub();
      this.sinon.useFakeTimers();
      manager.init();
    });

    test('EmergencyCbMode changes to active with 1 min duration', function() {
      manager.onEmergencyCbModeChange({
        active: true,
        timeoutMs: 60 * 1000
      });

      assert.equal(manager.timer, 60 * 1000);
      assert.ok(manager.timeoutController);
      assert.ok(manager._conn.ondataerror);
      assert.isTrue(manager.notification.classList.contains('displayed'));
      assert.isTrue(manager.toaster.classList.contains('displayed'));

      // Toaster should hide after timeout
      this.sinon.clock.tick(manager.TOASTER_TIMEOUT + 1);
      assert.isFalse(manager.toaster.classList.contains('displayed'));

      // clear timeoutController after 1 min
      this.sinon.clock.tick(60 * 1000);
      assert.isNull(manager.timeoutController);
    });

    test('EmergencyCbMode changes to inactive', function() {
      manager.onEmergencyCbModeChange({ active: false });
      assert.isFalse(manager.warningDialog.classList.contains('visible'));
      assert.isTrue(manager.warningDialog.hidden);
      assert.isNull(manager.timeoutController);
      assert.isNull(manager._conn.ondataerror);
      assert.isFalse(manager.notification.classList.contains('displayed'));
    });
  });
});
