'use strict';

/* global fb */

var utils = window.utils || {};

if (!utils.getContactById) {
  utils.getContactById = function(contactID, successCb, errorCb) {
    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: contactID
    };
    var request = navigator.mozContacts.find(options);

    request.onsuccess = function findCallback(e) {
      var result = e.target.result[0];

      if (typeof fb !== 'object' || !fb.isFbContact(result)) {
        successCb(result);
        return;
      }

      var fbContact = new fb.Contact(result);
      var fbReq = fbContact.getData();
      fbReq.onsuccess = function() {
        successCb(result, fbReq.result);
      };
      fbReq.onerror = successCb.bind(null, result);
    }; // request.onsuccess

    if (typeof errorCb === 'function') {
      request.onerror = errorCb;
    }
  };
}

if (!utils.isEmpty) {
  // Checks if an object fields are empty, by empty means
  // field is null and if it's an array it's length is 0
  utils.isEmpty = function isEmpty(obj, fields) {
    if (obj == null || typeof(obj) != 'object' ||
        !fields || !fields.length) {
      return true;
    }
    var attr;
    for (var i = 0; i < fields.length; i++) {
      attr = fields[i];
      if (obj[attr]) {
        if (Array.isArray(obj[attr])) {
          if (obj[attr].length > 0) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    return true;
  };
}

if (!utils.updatePhoto) {
  utils.updatePhoto = function updatePhoto(photo, dest) {
    var background = '';
    if (photo != null) {
      background = 'url(' + URL.createObjectURL(photo) + ')';
    }
    dest.style.backgroundImage = background;
    // Only for testing purposes
    dest.dataset.photoReady = 'true';
  };
}

if (!utils.addExtrasToContact) {
  utils.addExtrasToContact = function (extras, currentContact) {
    try {
      for (var type in extras) {
        var extra = extras[type];
        if (currentContact[type]) {
          if (Array.isArray(currentContact[type])) {
            var joinArray = currentContact[type].concat(extra);
            currentContact[type] = joinArray;
          } else {
            currentContact[type] = extra;
          }
        } else {
          currentContact[type] = Array.isArray(extra) ? extra : [extra];
        }
      }

      return currentContact;

    } catch (e) {
      console.error('Extras malformed');
      return null;
    }
  };
}
