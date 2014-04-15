'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate media storage settings', function() {
  var client = marionette.client();
  var settingsApp;
  var mediaStoragePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Media storage menu
    mediaStoragePanel = settingsApp.mediaStoragePanel;
  });

  suite('check media storage basics', function() {
    test('check initial state', function() {
      assert.ok(
        !mediaStoragePanel.isSharingUSBEnabled,
        'Sharing USB is disabled by default'
      );
    });

    test('check storage data contain numbers', function() {
      assert.ok(mediaStoragePanel.containNumberInMusicSpace);
      assert.ok(mediaStoragePanel.containNumberInPictureSpace);
      assert.ok(mediaStoragePanel.containNumberInVideoSpace);
    });

    test('check free/total space contain numbers', function() {
      assert.ok(mediaStoragePanel.containNumberInFreeSpace);
      assert.ok(mediaStoragePanel.containNumberInTotalSpace);
    });

    test('change Sharing USB mode', function() {
      mediaStoragePanel.tapOnSharingUSB();
      assert.ok(
        mediaStoragePanel.isSharingUSBEnabled,
        'Sharing USB mode has been enabled'
      );
    });

    test('tap on Format SD card button', function() {
      mediaStoragePanel.tapOnFormatSdcardButton();
      assert.ok(
        mediaStoragePanel.isFormatSdcardDialogShowed,
        'will show dialog'
      );
    });

  });

  suite('check media storage advanced', function() {
    test('check initial state', function() {
      assert.ok(
        !mediaStoragePanel.isMediaLocationSelectorEnabled,
        'Media location selector is disabled by default'
      );
    });
  });
});
