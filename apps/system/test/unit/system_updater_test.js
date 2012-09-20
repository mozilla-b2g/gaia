requireApp('system/js/system_updater.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_custom_dialog.js');
requireApp('system/test/unit/mock_notification_helper.js');
requireApp('system/test/unit/mock_utility_tray.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.CustomDialog) {
  this.CustomDialog = null;
}
if (!this.NotificationHelper) {
  this.NotificationHelper = null;
}
if (!this.UtilityTray) {
  this.UtilityTray = null;
}

suite('system/system_updater', function() {
  var subject;
  var statusDiv;

  var realCustomDialog;
  var realNotificationHelper;
  var realUtilityTray;
  var realL10n;
  var realDispatchEvent;

  var lastDispatchedEvent = null;

  suiteSetup(function() {
    subject = SystemUpdater;

    realCustomDialog = window.CustomDialog;
    window.CustomDialog = MockCustomDialog;

    realNotificationHelper = window.NotificationHelper;
    window.NotificationHelper = MockNotificationHelper;

    realUtilityTray = window.UtilityTray;
    window.UtilityTray = MockUtilityTray;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      }
    };

    realDispatchEvent = subject._dispatchEvent;
    subject._dispatchEvent = function fakeDispatch(type, value) {
      lastDispatchedEvent = {
        type: type,
        value: value
      };
    };
  });

  suiteTeardown(function() {
    window.CustomDialog = realCustomDialog;
    window.NotificationHelper = realNotificationHelper;
    window.UtilityTray = realUtilityTray;

    navigator.mozL10n = realL10n;
    subject._dispatchEvent = realDispatchEvent;
  });

  setup(function() {
    statusDiv = document.createElement('div');
    statusDiv.id = 'system-update-status';
    statusDiv.innerHTML = [
      '<div id="system-update-status" class="notification">',
      '  <div class="system-update-progress" data-l10n-id="updateProgress">' +
           'System update...</div>',
      '  <div class="system-update-applying" data-l10n-id="applying">' +
           'Applying...</div>',
      '  <div class="icon"></div>',
      '  <progress value="0" max="1"></progress>',
      '</div>'
    ].join('');

    document.body.appendChild(statusDiv);
  });

  teardown(function() {
    MockCustomDialog.mTearDown();
    MockNotificationHelper.mTearDown();
    MockUtilityTray.mTearDown();

    var el = document.getElementById('system-update-status');
    el.parentNode.removeChild(el);
  });

  suite('update available event', function() {
    setup(function() {
      var event = new MockChromeEvent({
        type: 'update-available'
      });
      subject.handleEvent(event);
    });

    test('notification sent', function() {
      assert.equal('updateAvailable', MockNotificationHelper.mTitle);
      assert.equal('getIt', MockNotificationHelper.mBody);
      assert.equal('style/system_updater/images/download.png',
                   MockNotificationHelper.mIcon);
    });

    test('notification close callback', function() {
      assert.equal(subject.declineDownload.name,
                   MockNotificationHelper.mCloseCB.name);

      subject.declineDownload();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-available-result', lastDispatchedEvent.type);
      assert.equal('wait', lastDispatchedEvent.value);
    });

    test('notification click callback', function() {
      assert.equal(subject.showDownloadPrompt.name,
                   MockNotificationHelper.mClickCB.name);

      subject.showDownloadPrompt();
      assert.isTrue(MockCustomDialog.mShown);
      assert.equal('updateAvailable', MockCustomDialog.mShowedTitle);
      assert.equal('wantToDownload', MockCustomDialog.mShowedMsg);

      assert.equal('later', MockCustomDialog.mShowedCancel.title);
      assert.equal('download', MockCustomDialog.mShowedConfirm.title);
    });

    suite('prompt handling', function() {
      setup(function() {
        subject.showDownloadPrompt();
      });

      test('cancel callback', function() {
        assert.equal(subject.declineDownload.name,
                     MockCustomDialog.mShowedCancel.callback.name);

        subject.declineDownload();
        assert.isFalse(MockCustomDialog.mShown);

        assert.equal('update-available-result', lastDispatchedEvent.type);
        assert.equal('wait', lastDispatchedEvent.value);
      });

      test('confirm callback', function() {
        assert.equal(subject.acceptDownload.name,
                     MockCustomDialog.mShowedConfirm.callback.name);

        subject.acceptDownload();
        assert.isFalse(MockCustomDialog.mShown);

        assert.equal('update-available-result', lastDispatchedEvent.type);
        assert.equal('download', lastDispatchedEvent.value);

        assert.equal('displayed', subject.updateStatus.className);
        assert.isTrue(MockUtilityTray.mShown);
      });
    });
  });

  suite('update progress event', function() {
    setup(function() {
      var event = new MockChromeEvent({
        type: 'update-progress',
        progress: 0.5,
        total: 1
      });

      subject.handleEvent(event);
    });

    test('update the progress element', function() {
      var progressEl = subject.updateStatus.querySelector('progress');
      assert.equal(0.5, progressEl.value);
    });

    suite('download complete', function() {
      setup(function() {
        var event = new MockChromeEvent({
          type: 'update-progress',
          progress: 1,
          total: 1
        });

        subject.handleEvent(event);
      });

      test('show the spinner', function() {
        assert.notEqual(-1, subject.updateStatus.className.indexOf('applying'));
      });
    });
  });

  suite('update downloaded event', function() {
    setup(function() {
      MockUtilityTray.show();

      var event = new MockChromeEvent({
        type: 'update-downloaded'
      });
      subject.handleEvent(event);
    });

    test('utility tray hidden', function() {
      assert.isFalse(MockUtilityTray.mShown);
    });

    test('update status hidden', function() {
      var progressEl = subject.updateStatus.querySelector('progress');
      assert.equal(0, progressEl.value);

      assert.equal(-1, subject.updateStatus.className.indexOf('applying'));
      assert.equal(-1, subject.updateStatus.className.indexOf('displayed'));
    });

    test('dialog shown', function() {
      assert.isTrue(MockCustomDialog.mShown);
      assert.equal('updateReady', MockCustomDialog.mShowedTitle);
      assert.equal('wantToInstall', MockCustomDialog.mShowedMsg);

      assert.equal('later', MockCustomDialog.mShowedCancel.title);
      assert.equal('restart', MockCustomDialog.mShowedConfirm.title);
    });

    test('cancel callback', function() {
      assert.equal(subject.declineInstall.name,
                   MockCustomDialog.mShowedCancel.callback.name);

      subject.declineInstall();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-downloaded-result', lastDispatchedEvent.type);
      assert.equal('wait', lastDispatchedEvent.value);
    });

    test('confirm callback', function() {
      assert.equal(subject.acceptInstall.name,
                   MockCustomDialog.mShowedConfirm.callback.name);

      subject.acceptInstall();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-downloaded-result', lastDispatchedEvent.type);
      assert.equal('restart', lastDispatchedEvent.value);
    });
  });
});

