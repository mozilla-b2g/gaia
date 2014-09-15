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
    test.skip('check storage data contain numbers', function() {
      assert.ok(mediaStoragePanel.containNumberInMusicSpace);
      assert.ok(mediaStoragePanel.containNumberInPictureSpace);
      assert.ok(mediaStoragePanel.containNumberInVideoSpace);
    });

    test.skip('check free/total space contain numbers', function() {
      assert.ok(mediaStoragePanel.containNumberInFreeSpace);
      assert.ok(mediaStoragePanel.containNumberInTotalSpace);
    });

    // Since 'canBeFormatted' attribute is false on b2g desktop,
    // there is no foramt button for the functionality.
    // So we have to skip over the test case.
    // Once bug 1055992 fixed, we can re-enable the test case.
    test.skip('tap on Format SD card button', function() {
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
