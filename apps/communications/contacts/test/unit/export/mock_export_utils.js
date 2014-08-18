/* exported MockContactToVcarBlob, MockGetStorageIfAvailable,
            MockGetUnusedFilename, MockGetStorageIfAvailableError */

'use strict';

var MockGetStorageIfAvailable = function(type, size, callback) {
  callback(navigator.getDeviceStorage());
};

var MockGetStorageIfAvailableError = function(type, size, callback, cbErr) {
  if (cbErr) {
    cbErr(0); // Simulate no space error
  } else {
    callback(navigator.getDeviceStorage());
  }
};

var MockGetUnusedFilename = function(storage, filename, callback) {
  callback(filename);
};

var MockContactToVcarBlob = function(contacts, callback) {
  callback({ size: contacts.length });
};
