'use strict';

var MockFb = {
  fbContact: false,
  fbLinked: false,
  isEnabled: true,

  CATEGORY: 'facebook',
  NOT_LINKED: 'not_linked',
  LINKED: 'fb_linked',

  // Default, can be changed by specific tests
  operationsTimeout: 20000,

  // mocks the saved data
  savedData: []
};

MockFb.setIsFbContact = function(isFB) {
  this.fbContact = isFB;
};

MockFb.setIsFbLinked = function(isLinked) {
  this.fbLinked = isLinked;
};

MockFb.setIsEnabled = function(isEnabled) {
  this.isEnabled = isEnabled;
};

MockFb.Contact = function(devContact, mozCid) {
  var deviceContact = devContact;
  var cid = mozCid;
  var contactData;

  function markAsFb(deviceContact) {
    if (!deviceContact.category) {
      deviceContact.category = [];
    }

    if (deviceContact.category.indexOf(MockFb.CATEGORY) === -1) {
      deviceContact.category.push(MockFb.CATEGORY);
      deviceContact.category.push(MockFb.NOT_LINKED);
    }

    return deviceContact;
  }

  function doGetFacebookUid(data) {
    var out = data.uid;
    if (!out) {
      if (MockFb.isFbLinked(data)) {
        out = getLinkedTo(data);
      }
      else if (data.category) {
        var idx = data.category.indexOf(fb.CATEGORY);
        if (idx !== -1) {
          out = data.category[idx + 2];
        }
      }
    }
    return out;
  }

  function getLinkedTo(c) {
    var out;

    if (c.category) {
      var idx = c.category.indexOf(fb.LINKED);
      if (idx !== -1) {
        out = c.category[idx + 1];
      }
    }

    return out;
  }

  function doSetFacebookUid(deviceContact, value) {
    if (!deviceContact.category) {
      deviceContact.category = [];
    }

    if (deviceContact.category.indexOf(fb.CATEGORY) === -1) {
      markAsFb(deviceContact);
    }

    var idx = deviceContact.category.indexOf(fb.CATEGORY);

    deviceContact.category[idx + 2] = value;
  }

  function getFacebookUid() {
    return doGetFacebookUid(deviceContact);
  }

  function setFacebookUid(value) {
    doSetFacebookUid(deviceContact, value);
  }

  this.getData = function getData() {
    return {
      set onsuccess(callback) {
        // Fetch FB data, that is returning a contact info
        this.result = deviceContact;
        this.result.org[0] = 'FB';

        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  }

  this.setData = function(data) {
    contactData = data;
  }

  this.save = function() {
    return {
      set onsuccess(callback) {
        MockFb.savedData.push(contactData);
        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  }

  this.getDataAndValues = function getDataAndValues() {
    return {
      set onsuccess(callback) {
        // Fetch FB data, that is returning a contact info
        this.result = [];
        this.result[0] = deviceContact;
        this.result[1] = {
          '+346578888888': 'p',
          'test@test.com': 'p'
        };

        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  }

  this.promoteToLinked = function promoteToLinked() {

  }

  Object.defineProperty(this, 'uid', {
    get: getFacebookUid,
    set: setFacebookUid,
    enumerable: true,
    configurable: false
  });

};

MockFb.isFbContact = function(contact) {
  return this.fbContact;
};

MockFb.isFbLinked = function(contact) {
  return this.fbLinked;
};

MockFb.isEnabled = function() {
  return this.isEnabled;
};

MockFb.getWorksAt = function(fbData) {
  return 'Telef—nica';
};

MockFb.getAddress = function(fbData) {
  var out = {};
  out.type = ['home'];
  out.locality = 'Palencia';
  out.region = 'Castilla y Le—n';
  out.countryName = 'Espa–a';
};
