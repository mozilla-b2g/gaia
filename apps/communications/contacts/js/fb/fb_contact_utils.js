'use strict';

var fb = this.fb || {};
fb.CATEGORY = 'facebook';
fb.NOT_LINKED = 'not_linked';
fb.LINKED = 'fb_linked';

// Types of URLs for FB Information
fb.PROFILE_PHOTO_URI = 'fb_profile_photo';
fb.FRIEND_URI = 'fb_friend';

fb.CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

// Some convenience functions follow

fb.isFbContact = function(devContact) {
  return (devContact && devContact.category &&
          devContact.category.indexOf(fb.CATEGORY) !== -1);
};


fb.isFbLinked = function(devContact) {
  return (devContact.category &&
                        devContact.category.indexOf(fb.LINKED) !== -1);
};


fb.getFriendUid = function(devContact) {
  var out = devContact.uid;

  if (!out) {
    if (fb.isFbLinked(devContact)) {
      out = fb.getLinkedTo(devContact);
    }
    else if (devContact.category) {
      var idx = devContact.category.indexOf(fb.CATEGORY);
      if (idx !== -1) {
        out = devContact.category[idx + 2];
      }
    }
  }

  return out;
};


fb.getLinkedTo = function(devContact) {
  var out;

  if (devContact.category) {
    var idx = devContact.category.indexOf(fb.LINKED);
    if (idx !== -1) {
      out = devContact.category[idx + 1];
    }
  }

  return out;
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
  devContact.url = devContact.url || [];

  devContact.url.push({
    type: [fb.PROFILE_PHOTO_URI],
    value: url
  });
};

// Adapts data to the mozContact format names
fb.friend2mozContact = function(f) {
// givenName is put as name but it should be f.first_name
  f.familyName = [f.last_name ? f.last_name.trim() : (f.last_name || '')];
  var middleName = f.middle_name ? f.middle_name.trim() : (f.middle_name || '');
  f.additionalName = middleName;
  var firstName = f.first_name ? f.first_name.trim() : (f.first_name || '');
  f.givenName = [(firstName + ' ' + middleName).trim()];

  delete f.last_name;
  delete f.middle_name;
  delete f.first_name;

  var privateType = 'personal';

  if (f.email) {
    f.email1 = f.email;
    f.email = [{
                  type: [privateType],
                  value: f.email
    }];
  }
  else {
    f.email1 = '';
  }

  var nextidx = 0;
  if (f.cell) {

    f.tel = [{
      type: [privateType],
      value: f.cell
    }];

    nextidx = 1;
  }

  if (f.other_phone) {
    if (!f.tel) {
      f.tel = [];
    }

    f.tel[nextidx] = {
      type: [privateType],
      value: f.other_phone
    };

  }

  delete f.other_phone;
  delete f.cell;

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
  var out = new Date();

  var imonth = sbday.indexOf('/');
  var smonth = sbday.substring(0, imonth);

  var iyear = sbday.lastIndexOf('/');
  if (iyear === imonth) {
    iyear = sbday.length;
  }
  var sday = sbday.substring(imonth + 1, iyear);

  var syear = sbday.substring(iyear + 1, sbday.length);

  out.setDate(parseInt(sday));
  out.setMonth(parseInt(smonth) - 1, parseInt(sday));

  if (syear && syear.length > 0) {
    out.setYear(parseInt(syear));
  }

  return out;
};

fb.getAddress = function(fbdata) {

  function fillAddress(fbAddress) {
    var outAddr = {};

    outAddr.type = ['home'];
    outAddr.locality = fbAddress.city || '';
    outAddr.region = fbAddress.state || '';
    outAddr.countryName = fbAddress.country || '';

    return outAddr;
  }

  var out;

  var addressInfo = fbdata.current_location || fbdata.hometown_location;
  if (addressInfo) {
    out = fillAddress(addressInfo);
  }

  return out;
};

// Merge done specifically for dialer and Call Log apps
fb.mergeContact = function(devContact, fbContact) {
  var fbPhotos = fbContact.photo;
  if (!devContact.photo && Array.isArray(fbPhotos)) {
    devContact.photo = [];
  }

  if (Array.isArray(fbPhotos) && fbPhotos.length > 0 && fbPhotos[0]) {
    devContact.photo.push(fbPhotos[0]);
  }

  if (!devContact.tel && Array.isArray(fbContact.tel)) {
    devContact.tel = [];
  }

  if (Array.isArray(fbContact.tel)) {
    fbContact.tel.forEach(function(atel) {
      devContact.tel.push(atel);
    });
  }

  return devContact;
};

fb.getContactByNumber = function(number, onsuccess, onerror) {
  var req = fb.contacts.getByPhone(number);

  req.onsuccess = function(e) {
    onsuccess(e.target.result);
  };

  req.onerror = onerror;
};

// Only will be executed in the case of not loading fb.utils previously
// i.e. dialer and call log FB integration
var fb = window.fb || {};
fb.utils = window.fb.utils || {};

// Returns the mozContact associated to a UID in FB
fb.utils.getMozContactByUid = function(uid, onsuccess, onerror) {
  var filter = {
    filterBy: ['category'],
    filterValue: uid,
    filterOp: 'contains'
  };

  var req = navigator.mozContacts.find(filter);
  req.onsuccess = onsuccess;
  req.onerror = onerror;
};

 /**
  *   Request auxiliary object to support asynchronous calls
  *
  */
fb.utils.Request = function() {
  this.done = function(result) {
    this.result = result;
    if (typeof this.onsuccess === 'function') {
      var ev = {};
      ev.target = this;
      window.setTimeout(function() {
        this.onsuccess(ev);
      }.bind(this), 0);
    }
  }

  this.failed = function(error) {
    this.error = error;
    if (typeof this.onerror === 'function') {
      var ev = {};
      ev.target = this;
      window.setTimeout(function() {
        this.onerror(ev);
      }.bind(this), 0);
    }
  }
};
