'use strict';

/* exported MockContactPhotoHelper */

var MockContactPhotoHelper = {
  getThumbnail: function(contact) {
    if (!contact || !contact.photo || !contact.photo.length) {
      return null;
    }

    return contact.photo[0];
  },

  getFullResolution: function(contact) {
    if (!contact || !contact.photo || !contact.photo.length) {
      return null;
    }

    return contact.photo[0];
  }
};
