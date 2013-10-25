'use strict';

var MockSdCard = function MockSdCard() {

  var observers = {};

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

  var failOnRetrieveFiles = false;
  var STATUSES = {
    NOT_INITIALIZED: 0,
    NOT_AVAILABLE: 1,
    AVAILABLE: 2
  };

  var status = STATUSES.AVAILABLE;

  var updateStorageState = function updateStorageState(state) {
    switch (state) {
      case 'available':
      case 'shared':
        status = STATUSES.AVAILABLE;
        break;
      case 'unavailable':
      case 'deleted':
        status = STATUSES.NOT_AVAILABLE;
        break;
    }
  };

  var deviceStorage = null;
  var setDeviceStorage = function setDeviceStorage(ds) {
    deviceStorage = ds;
    deviceStorage.addEventListener('change',
      function sd_deviceStorageChangeHandler(e) {
      updateStorageState(e.reason);
    });
  };

  var subscribeToChanges = function subscribeToChanges(name, func, force) {
    if (observers[name] !== undefined && !force) {
      return false;
    }

    observers[name] = func;
    return true;
  };

  var unsubscribeToChanges = function unsubscribeToChanges(name) {
    if (observers[name]) {
      delete observers[name];
      return true;
    } else {
      return false;
    }
  };

  return {
    NOT_INITIALIZED: STATUSES.NOT_INITIALIZED,
    NOT_AVAILABLE: STATUSES.NOT_AVAILABLE,
    AVAILABLE: STATUSES.AVAILABLE,
    set failOnRetrieveFiles(value) {
      failOnRetrieveFiles = value;
    },
    get status() {
      return status;
    },
    set status(value) {
      status = value;
      // Trigger the status change to any observer
      Object.keys(observers).forEach(function onStatus(name) {
        if (typeof(observers[name]) === 'function') {
          observers[name].call(null, value);
        }
      });
    },
    get deviceStorage() {
      return deviceStorage;
    },
    'updateStorageState': updateStorageState,
    'checkStorageCard': function checkStorageCard() {
      return status === STATUSES.AVAILABLE;
    },
    'retrieveFiles': function retrieveFiles(mimes, ext, cb) {
      cb(failOnRetrieveFiles, [
        {
          name: 'vcf1.vcf',
          type: 'text/vcard'
        }
      ]);
    },
    'getTextFromFiles': function getTextFromFiles(fileArray, contents, cb) {
      cb(null, mock_sdcard_vcf);
    },
    'subscribeToChanges': subscribeToChanges,
    'unsubscribeToChanges': unsubscribeToChanges

  };

}();
