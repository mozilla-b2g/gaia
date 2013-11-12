/* exported MockContactToVcarBlob, MockGetStorageIfAvailable,
            MockGetUnusedFilename */

'use strict';

var MockGetStorageIfAvailable = function(type, size, callback) {
  callback(navigator.getDeviceStorage());
};

var MockGetUnusedFilename = function(storage, filename, callback) {
  callback(filename);
};

var MockContactToVcarBlob = function(contacts, callback) {
  callback({ size: contacts.length });
};
