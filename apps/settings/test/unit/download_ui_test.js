/* global MocksHelper, MockL10n, MockDownload, DownloadUI, DownloadFormatter */


'use strict';

requireApp('settings/test/unit/mock_mime_mapper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_download.js');
require('/shared/test/unit/mocks/mock_download_formatter.js');
require('/shared/test/unit/mocks/mock_l10n.js');

require('/shared/js/download/download_ui.js');

var mocksHelperForDownloadUI = new MocksHelper([
  'LazyLoader',
  'DownloadFormatter',
  'MimeMapper'
]).init();

suite('DownloadUI', function() {
  var realL10n, download, dialogSelector = '#downloadConfirmUI',
      dialogButtonsSelector = '#downloadConfirmUI button',
      actionMenuSelector = '#downloadActionMenuUI',
      actionMenuButtonsSelector = '#downloadActionMenuUI button',
      actionMenuHeaderSelector = '#downloadActionMenuUI header',
      ringtoneButtonSelector = '#RINGTONE',
      wallpaperButtonSelector = '#WALLPAPER';

  mocksHelperForDownloadUI.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    var screen = document.getElementById('screen');
    document.body.removeChild(screen);

    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  setup(function() {
    var screen = document.createElement('div');
    screen.id = 'screen';
    document.body.appendChild(screen);

    download = new MockDownload();
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    download = null;
  });

  function checkDialogUI(type, numberOfButtons, sinon) {
    DownloadUI.show(type, download);
    sinon.clock.tick(0);

    assert.equal(document.querySelectorAll(dialogSelector).length, 1);
    assert.equal(document.querySelectorAll(dialogButtonsSelector).length,
                 numberOfButtons);
    var rightButton = document.querySelector(dialogButtonsSelector +
                                             ':last-child');
    type.classes.forEach(function(clazz) {
      assert.isTrue(rightButton.classList.contains(clazz));
    });
  }

  function checkActionsUI(numberOfButtons, sinon) {
    DownloadUI.showActions(download);
    sinon.clock.tick(0);

    assert.equal(document.querySelectorAll(actionMenuSelector).length, 1);
    assert.equal(document.querySelector(actionMenuHeaderSelector).textContent,
                 DownloadFormatter.getFileName(download));
    assert.equal(document.querySelectorAll(actionMenuButtonsSelector).length,
                 numberOfButtons);
  }

  test('Dialogs with just one button ', function() {
    var types = [DownloadUI.TYPE.FILE_NOT_FOUND, DownloadUI.TYPE.NO_SDCARD,
                 DownloadUI.TYPE.UNMOUNTED_SDCARD, DownloadUI.TYPE.NO_PROVIDER];

    types.forEach((function(type) {
      checkDialogUI(type, 1, this.sinon);
    }).bind(this));
  });

  test('Dialogs with two buttons ', function() {
    var types = [DownloadUI.TYPE.STOP, DownloadUI.TYPE.STOPPED,
                 DownloadUI.TYPE.FAILED, DownloadUI.TYPE.DELETE,
                 DownloadUI.TYPE.UNSUPPORTED_FILE_TYPE,
                 DownloadUI.TYPE.FILE_OPEN_ERROR];

    types.forEach((function(type) {
      checkDialogUI(type, 2, this.sinon);
    }).bind(this));
  });

  test('Display actions for a video (three buttons) ', function() {
    download.contentType = 'video/mp4';
    checkActionsUI(3, this.sinon);
    assert.isNull(document.querySelector(ringtoneButtonSelector));
    assert.isNull(document.querySelector(wallpaperButtonSelector));
  });

  test('Display actions for an audio (four buttons)', function() {
    download.contentType = 'audio/mp3';
    checkActionsUI(4, this.sinon);
    assert.ok(document.querySelector(ringtoneButtonSelector));
    assert.isNull(document.querySelector(wallpaperButtonSelector));
  });

  test('Display actions for an image (four buttons)', function() {
    download.contentType = 'image/png';
    checkActionsUI(4, this.sinon);
    assert.ok(document.querySelector(wallpaperButtonSelector));
    assert.isNull(document.querySelector(ringtoneButtonSelector));
  });

  test('Dialog UI will be not displayed twice ', function() {
    DownloadUI.show(DownloadUI.TYPE.STOPPED, download);
    DownloadUI.show(DownloadUI.TYPE.STOPPED, download);
    assert.equal(document.querySelectorAll(dialogSelector).length, 1);
  });

  test('Hide dialog UI ', function() {
    DownloadUI.show(DownloadUI.TYPE.STOPPED, download);
    this.sinon.clock.tick(0);
    DownloadUI.hide();
    assert.equal(document.querySelector(dialogSelector).innerHTML, '');
  });

  test('Menu actions UI will be not displayed twice ', function() {
    DownloadUI.showActions(download);
    DownloadUI.showActions(download);
    assert.equal(document.querySelectorAll(actionMenuSelector).length, 1);
  });

  test('Hide menu action UI ', function() {
    DownloadUI.showActions(download);
    this.sinon.clock.tick(0);
    DownloadUI.hide();
    assert.equal(document.querySelector(actionMenuSelector).innerHTML, '');
  });


});
