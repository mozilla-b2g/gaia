/* global MocksHelper, BaseModule, MockNavigatorSettings, NotificationHelper,
          ModalDialog, ScreenManager */
'use strict';

require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/test/unit/mock_modal_dialog.js');
require('/test/unit/mock_screen_manager.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/supl_handler.js');

var mocksForSuplHandler = new MocksHelper([
  'ModalDialog',
  'ScreenManager',
  'NotificationHelper'
]).init();

suite('system/SuplHandler', function() {
  mocksForSuplHandler.attachTestHelpers();

  var subject;
  var locked;
  var realMozSettings;

  var verifyDetail = {
    type: 'supl-verification',
    id: 123
  };

  var timeoutDetail = {
    type: 'supl-verification-timeout',
    id: verifyDetail.id
  };

  function triggerMozChromeEvent(detail) {
    window.dispatchEvent(new CustomEvent('mozChromeEvent', {
      detail: detail
    }));
  }

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    window.lockScreenWindowManager = {
      isActive: () => locked
    };
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.lockScreenWindowManager = undefined;
  });

  setup(function() {
    locked = false;
    MockNavigatorSettings.mSetup();

    subject = BaseModule.instantiate('SuplHandler');
    subject.start();
  });

  teardown(function() {
    subject.stop();
    MockNavigatorSettings.mTeardown();
  });

  suite('notification', function() {
    setup(function() {
      this.sinon.spy(NotificationHelper, 'send');
      triggerMozChromeEvent({
        type: 'supl-notification',
      });
    });

    test('should trigger notification', function() {
      assert.isTrue(NotificationHelper.send.called);
    });

    test('should show the dialog when user click the notification', function() {
      this.sinon.stub(ModalDialog, 'alert');
      NotificationHelper.mEmit('click');
      assert.isTrue(ModalDialog.alert.called);
    });
  });

  suite('verification', function() {
    setup(function() {
      this.sinon.stub(subject, 'showDialog');
      triggerMozChromeEvent(verifyDetail);
    });

    test('should call showDialog',
      function() {
        assert.isTrue(subject.showDialog.called);
      }
    );

    test('should not call showDialog again if previous one is not dismissed',
      function() {
        subject.showDialog.reset();
        triggerMozChromeEvent(verifyDetail);
        assert.isFalse(subject.showDialog.called);
      }
    );

    test('should cancel dialog if timeouted', function() {
      ModalDialog.cancelHandler = this.sinon.stub();
      triggerMozChromeEvent(timeoutDetail);
      assert.isTrue(ModalDialog.cancelHandler.called);
    });
  });

  suite('verification when screen is locked', function() {
    setup(function() {
      locked = true;
      this.sinon.stub(subject, 'showDialog');
      this.sinon.spy(NotificationHelper, 'send');
      triggerMozChromeEvent(verifyDetail);
    });

    test('should trigger notification', function() {
      assert.isFalse(subject.showDialog.called);
      assert.isTrue(NotificationHelper.send.called);
    });

    test('should call showDialog when user click the notification', function() {
      NotificationHelper.mEmit('click');
      assert.isTrue(subject.showDialog.called);
    });

    test('should close notification if timeouted', function() {
      var pendingNotification = subject._pendingNotification;
      this.sinon.stub(pendingNotification, 'close');
      triggerMozChromeEvent(timeoutDetail);
      assert.isTrue(pendingNotification.close.called);
    });
  });

  suite('showDialog', function() {
    var choiceKey = 'supl.verification.choice';

    setup(function() {
      subject._pendingVerification = verifyDetail.id;
      this.sinon.stub(ScreenManager, 'turnScreenOn');
      this.sinon.stub(ModalDialog, 'confirm');
    });

    test('should turn screen on', function() {
      subject.showDialog(verifyDetail);
      assert.isTrue(ScreenManager.turnScreenOn.called);
    });

    test('should trigger modal dialog', function() {
      subject.showDialog(verifyDetail);
      assert.isTrue(ModalDialog.confirm.called);
    });

    test('should send positive id after user confirms', function() {
      subject.showDialog(verifyDetail);
      ModalDialog.confirm.args[0][2].callback();
      assert.equal(MockNavigatorSettings.mSettings[choiceKey], verifyDetail.id);
    });

    test('should send negative id after user cancels', function() {
      subject.showDialog(verifyDetail);
      ModalDialog.confirm.args[0][3].callback();
      assert.equal(MockNavigatorSettings.mSettings[choiceKey],
        -1 * verifyDetail.id);
    });
  });
});
