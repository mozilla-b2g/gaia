'use strict';

var FB_ID = 220439;

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

MockFb.contacts = function() {
  var getAll = function getAll() {
    return {
      set onsuccess(callback) {
        // Fetch FB data, that is returning a contact info
        this.result = {};
        this.result[FB_ID] = new MockContactAllFields();
        var deviceContact = this.result[FB_ID];
        this.result[FB_ID].id = '567';
        this.result[FB_ID].familyName = ['Taylor'];
        this.result[FB_ID].givenName = ['Bret'];
        this.result[FB_ID].name = [this.result[FB_ID].givenName + ' ' +
                              this.result[FB_ID].familyName];
        this.result[FB_ID].org[0] = 'FB';
        this.result[FB_ID].adr[0] = MockFb.getAddress();

        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  };

  return {
    'getAll': getAll
  };

}();

MockFb.Contact = function(devContact, mozCid) {
  var deviceContact = devContact;
  var cid = mozCid;
  var contactData;

  if (devContact)
    setFacebookUid(FB_ID);

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
        this.result = new MockContactAllFields();
        deviceContact = this.result;
        setFacebookUid(FB_ID);
        this.result.id = '567';
        this.result.familyName = ['Taylor'];
        this.result.givenName = ['Bret'];
        this.result.name = [this.result.givenName + ' ' +
                              this.result.familyName];
        this.result.org[0] = 'FB';
        this.result.adr[0] = MockFb.getAddress();

        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  };

  this.setData = function(data) {
    contactData = data;
  };

  this.save = function() {
    return {
      set onsuccess(callback) {
        MockFb.savedData.push(contactData);
        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  };

  this.merge = function(deviceContact) {
    deviceContact.id = '567';
    deviceContact.familyName = ['Taylor'];
    deviceContact.givenName = ['Bret'];
    deviceContact.name = [deviceContact.givenName + ' ' +
                          deviceContact.familyName];
    deviceContact.org[0] = 'FB';
    deviceContact.adr[0] = MockFb.getAddress();

    return deviceContact;
  };

  this.getDataAndValues = function getDataAndValues() {
    return {
      set onsuccess(callback) {
        // Fetch FB data, that is returning a contact info
        this.result = [];
        this.result[0] = new MockContactAllFields();
        this.result[0].adr[0] = MockFb.getAddress();
        this.result[1] = {
          '+346578888888': true,
          'test@test.com': true,
          'Palencia': true,
          'Castilla y León': true,
          'España': true
        };

        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  };

  this.promoteToLinked = function promoteToLinked() {

  };

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
  return 'Telefónica';
};

MockFb.getAddress = function(fbData) {
  var out = {};
  out.type = ['home'];
  out.locality = 'Palencia';
  out.region = 'Castilla y León';
  out.countryName = 'España';

  return out;
};
