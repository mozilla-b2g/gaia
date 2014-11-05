'use strict';

/* global fb, utils  */

/* jshint ignore:start */
var fb = this.fb || {};
/* jshint ignore:end */

fb.PROPAGATED_PREFIX = 'fb_propagated_';

// Types of URLs for FB Information
fb.PROFILE_PHOTO_URI = 'fb_profile_photo';
fb.FRIEND_URI = 'fb_friend';
fb.DEFAULT_PHONE_TYPE = 'other';
fb.DEFAULT_EMAIL_TYPE = 'other';
 // This year indicates that the year can be ignored (yearless date)
fb.FLAG_YEAR_IGNORED = 9996;

fb.CONTACTS_APP_ORIGIN = location.origin;

fb.isPropagated = function fcu_isPropagated(field, devContact) {
  return (devContact.category && devContact.category.
                                  indexOf(fb.PROPAGATED_PREFIX + field) !== -1);
};

fb.removePropagatedFlag = function fcu_removePropagatedFlag(field, devContact) {
  var idx = devContact.category.indexOf(fb.PROPAGATED_PREFIX + field);
  if (idx !== -1) {
    devContact.category.splice(idx, 1);
  }
};

fb.setPropagatedFlag = function fcu_setPropagatedFlag(field, devContact) {
  var idx = devContact.category.indexOf(fb.PROPAGATED_PREFIX + field);
  if (idx === -1) {
    devContact.category.push(fb.PROPAGATED_PREFIX + field);
  }
};


fb.getFriendPictureUrl = function(devContact) {
  var out;

  var urls = devContact.url;

  if (urls) {
    for (var c = 0; c < urls.length; c++) {
      var aurl = urls[c];
      if (aurl.type.indexOf(fb.PROFILE_PHOTO_URI) !== -1) {
        out = aurl.value;
        break;
      }
    }
  }

  return out;
};

fb.setFriendPictureUrl = function(devContact, url) {
  var urls = devContact.url || [];

  urls.push({
    type: [fb.PROFILE_PHOTO_URI],
    value: url
  });

  devContact.url = urls;
};

// Adapts data to the mozContact format names
fb.friend2mozContact = function(f) {

  function normalizeFbPhoneNumber(phone) {
    var out = phone.number;
    if (phone.country_code && out.indexOf('+') !== 0) {
      out = '+' + phone.country_code + out;
    }
    return out;
  }

  // Check whether this has been already normalized to mozContact
  if (Array.isArray(f.familyName)) {
    return f;
  }

// givenName is put as name but it should be f.first_name
  f.familyName = [f.last_name ? f.last_name.trim() : (f.last_name || '')];
  var middleName = f.middle_name ? f.middle_name.trim() : (f.middle_name || '');
  f.additionalName = middleName;
  var firstName = f.first_name ? f.first_name.trim() : (f.first_name || '');
  f.givenName = [(firstName + ' ' + middleName).trim()];

  delete f.last_name;
  delete f.middle_name;
  delete f.first_name;

  if (f.email) {
    f.email1 = f.email;
    f.email = [{
                  type: [fb.DEFAULT_EMAIL_TYPE],
                  value: f.email
    }];
  }
  else {
    f.email1 = '';
  }

  if (Array.isArray(f.phones) && f.phones.length > 0) {
    f.tel = [];
    f.shortTelephone = [];
    f.phones.forEach(function(aphone) {
      f.tel.push({
        type: [fb.DEFAULT_PHONE_TYPE],
        value: normalizeFbPhoneNumber(aphone)
      });
      // Enabling to find FB phones by short number
      f.shortTelephone.push(aphone.number);
    });
  }

  delete f.phones;

  f.uid = f.uid.toString();

  return f;
};


/**
  * Auxiliary function to know where a contact works
  *
*/
fb.getWorksAt = function(fbdata) {
  var out = '';
  if (fbdata.work && fbdata.work.length > 0) {
    // It is assumed that first is the latest
    out = fbdata.work[0].employer.name;
  }

  return out;
};

 /**
  *  Facebook dates are MM/DD/YYYY
  *
  *  Returns the birth date
  *
  */
fb.getBirthDate = function getBirthDate(sbday) {
  var out = new Date(0);

  var imonth = sbday.indexOf('/');
  var smonth = sbday.substring(0, imonth);

  var iyear = sbday.lastIndexOf('/');
  if (iyear === imonth) {
    iyear = sbday.length;
  }
  var sday = sbday.substring(imonth + 1, iyear);

  var syear = sbday.substring(iyear + 1, sbday.length);

  out.setUTCDate(parseInt(sday, 10));
  out.setUTCMonth(parseInt(smonth, 10) - 1, parseInt(sday, 10));

  if (syear && syear.length > 0) {
    out.setUTCFullYear(parseInt(syear, 10));
  }
  else {
    // 9996 is the year that flags a not known year
    out.setUTCFullYear(fb.FLAG_YEAR_IGNORED);
  }

  out.setUTCHours(0);
  out.setUTCMinutes(0);
  out.setUTCSeconds(0);
  out.setUTCMilliseconds(0);

  return out;
};

fb.getAddresses = function(fbdata) {

  function fillAddress(fbAddress, type) {
    var outAddr = {};

    outAddr.type = [type];
    outAddr.locality = fbAddress.city || '';
    outAddr.region = fbAddress.state || '';
    outAddr.countryName = fbAddress.country || '';

    return outAddr;
  }

  var out = [];
  var addrTypes = {
    'home': 'hometown_location',
    'current': 'current_location'
  };

  Object.keys(addrTypes).forEach(function onAddressType(type) {
    var addrObj = fbdata[addrTypes[type]];
    if (addrObj) {
      out.push(fillAddress(addrObj, type));
    }
  });
  return out;
};

// The contact is now totally unlinked
// [...,facebook, fb_not_linked, 123456,....]
fb.markAsUnlinked = function(devContact) {
  var category = devContact.category;
  var updatedCategory = [];

  if (category) {
    var idx = category.indexOf(fb.CATEGORY);
    if (idx !== -1) {
      for (var c = 0; c < idx; c++) {
        updatedCategory.push(category[c]);
      }
      // The facebook category, the linked mark and the UID are skipped
      for (c = idx + 3; c < category.length; c++) {
         updatedCategory.push(category[c]);
      }
    }
  }

  devContact.category = updatedCategory;

  return devContact;
};

// Unlinks a FB Contact. This must only be called from the clean all process
fb.unlinkClearAll = function(devContact) {
  fb.resetNames(devContact);
  fb.markAsUnlinked(devContact);
};

// Reset givenName and familyName if it is needed after unlinking
fb.resetNames = function resetNames(dContact) {
  if (fb.isPropagated('givenName', dContact)) {
    dContact.givenName = [''];
    fb.removePropagatedFlag('givenName', dContact);
  }

  if (fb.isPropagated('familyName', dContact)) {
    dContact.familyName = [''];
    fb.removePropagatedFlag('familyName', dContact);
  }

  dContact.name = [dContact.givenName[0] + ' ' + dContact.familyName[0]];
};

// Marks that FB Cleaning is in progress or not
fb.markFbCleaningInProgress = function(value) {
  utils.cookie.update({
    fbCleaningInProgress: value
  });
};
