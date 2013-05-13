'use strict';

var mock_sdcard_vcf = 'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N:Gump;Forrest\n' +
  'FN:Forrest Gump\n' +
  'ORG:Bubba Gump Shrimp Co.\n' +
  'TITLE:Shrimp Man\n' +
  'PHOTO;GIF:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;WORK;VOICE:(111) 555-1212\n' +
  'TEL;HOME;VOICE:(404) 555-1212\n' +
  'ADR;WORK:;;100 Waters Edge;Baytown;LA;30314;United States of America\n' +
  'LABEL;WORK;ENCODING=QUOTED-PRINTABLE:100 Waters Edge=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'ADR;HOME:;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'LABEL;HOME;ENCODING=QUOTED-PRINTABLE:42 Plantation St.=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'EMAIL;PREF;INTERNET:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD';

var MockSdCard = {
  NOT_INITIALIZED: 0,
  NOT_AVAILABLE: 1,
  AVAILABLE: 2
};

MockSdCard.status = MockSdCard.AVAILABLE;
MockSdCard.deviceStorage = navigator.mozGetDeviceStorage('sdcard');

MockSdCard.updateStorageState = function sd_updateStorageState(state) {
  switch (state) {
    case 'available':
    case 'shared':
      MockSdCard.status = MockSdCard.AVAILABLE;
      break;
    case 'unavailable':
    case 'deleted':
      MockSdCard.status = MockSdCard.NOT_AVAILABLE;
      break;
  }
};

MockSdCard.deviceStorage
  .addEventListener('change', function sd_deviceStorageChangeHandler(e) {
    MockSdCard.updateStorageState(e.reason);
  });

if (MockSdCard.status === MockSdCard.NOT_INITIALIZED) {
  MockSdCard.deviceStorage.available().onsuccess = (function(e) {
    MockSdCard.updateStorageState(e.target.result);
  });
}

/**
 * Check whether there is a SD card inserted in the device.
 * @return {Boolean} return true if sd card present, false otherwise.
 */
MockSdCard.checkStorageCard = function sd_checkStorageCard() {
  return MockSdCard.status === MockSdCard.AVAILABLE;
};

MockSdCard.retrieveFiles = function retrieveFilesContent(mimes, exts, cb) {
  cb(null, [
    {
      name: 'vcf1.vcf',
      type: 'text/vcard'
    }
  ]);
};

/**
 * Extracts and concatenates text from the given array of file objects.
 *
 * @param {Array} fileArray Array of File Objects.
 * @param {String} contents Accumulated text from the previous recursive call.
 * @param {Function} cb Function to call when the work is finished.
 */
MockSdCard.getTextFromFiles = function(fileArray, contents, cb) {
  cb(null, mock_sdcard_vcf);
};
