'use strict';

var MockConnector = {
  listAllContacts: function(access_token, callbacks) {
    callbacks.success(MockImportedContacts);
  },

  listDeviceContacts: function(callbacks) {
    callbacks.success([]);
  },

  getImporter: function(contactsList, access_token) {
  },

  getCleaner: function(contactsList, access_token) {
  },

  adaptDataForShowing: function(source) {
    return source;
  },

  adaptDataForSaving: function live2MozContact(liveContact) {
  },

  getContactUid: function(deviceContact) {
    return deviceContact.uid || '-1';
  },

  get name() {
    return 'mock';
  },

  downloadContactPicture: function(contact, access_token, callbacks) {
    callbacks.success();
  },

  startSync: function() {
  }
};
