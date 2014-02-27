/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(exports) {
  'use strict';

  function getThumbnail(contact) {
    return getOnePhoto(contact, 'begin');
  }

  function getFullResolution(contact) {
    return getOnePhoto(contact, 'end');
  }

  function getOnePhoto(contact, position) {
    if (!contact || !contact.photo || !contact.photo.length) {
      return null;
    }

    if (contact.photo.length === 1) {
      return contact.photo[0];
    }

    // For FB Linked contacts we need to give preference to the local photo
    // [0] is the full resolution photo and [1] is the thumbnail
    var photos = contact.photo;
    var category = contact.category;
    if (Array.isArray(category) && category.indexOf('fb_linked') !== -1) {
      // Check whether we have a new linked contact or a legacy contact
      if (photos.length >= 4) {
        return photos[(position == 'begin') ? 1 : 0];
      }
      // In the case of a legacy contact we always return full resolution
      // in order to ensure we are always giving preference to local photo
      return photos[0];
    }

    photos = photosBySize(contact);
    var index = (position == 'begin') ? 0 : photos.length - 1;
    return photos[index];
  }

  function photosBySize(contact) {
    var photos = contact.photo.slice(0);
    photos.sort(function(p1, p2) {
      if (size(p1) < size(p2)) {
        return -1;
      }
      if (size(p1) > size(p2)) {
        return 1;
      }
      return 0;
    });

    return photos;
  }

  // For legacy purpose we support data URLs and blobs
  function size(photo) {
    if (typeof photo == 'string') {
      return photo.length; // length of the data URL
    }

    return photo.size; // size of the blob in bytes
  }

  exports.ContactPhotoHelper = {
    getThumbnail: getThumbnail,
    getFullResolution: getFullResolution
  };
})(window);
