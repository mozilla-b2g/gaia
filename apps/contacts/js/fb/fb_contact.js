'use strict';

var fb = window.fb || {};
fb.CATEGORY = 'facebook';
fb.NOT_LINKED = 'not_linked';


// Encapsulates all the logic to obtain the data for a FB contact
fb.Contact = function (deviceContact) {
  var contactData;
  var devContact = deviceContact;

    /**
     *   Request auxiliary object to support asynchronous calls
     *
     */
    var Request = function() {
      this.done = function(result) {
        this.result = result;
        if(typeof this.onsuccess === 'function') {
          this.onsuccess();
        }
      }

      this.failed = function(error) {
        this.error = error;
        if(typeof this.onerror === 'function') {
          this.onerror();
        }
      }
    }

  function doGetFacebookUid(data) {
    var out = data.uid;
    if(!out) {
      if(data.category) {
        var idx = data.category.indexOf(fb.CATEGORY);
        if(idx !== -1) {
          out = data.category[idx + 2];
        }
      }
    }
    return out;
  }

  function getFacebookUid() {
    return doGetFacebookUid(deviceContact);
  }

  function setFacebookUid(value) {
    doSetFacebookUid(deviceContact,value);
  }

  function doSetFacebookUid(dcontact,value) {
    if(!dcontact.category) {
      dcontact.category = [];
    }

    if(dcontact.category.indexOf(fb.CATEGORY) === -1) {
      markAsFb(dcontact);
    }

    var idx = dcontact.category.indexOf(fb.CATEGORY);

    dcontact.category[idx + 2] = value;
  }

  function markAsFb(dcontact) {
    if(!dcontact.category) {
      dcontact.category = [];
    }

    if(dcontact.category.indexOf(fb.CATEGORY) === -1) {
      dcontact.category.push(fb.CATEGORY);
      dcontact.category.push(fb.NOT_LINKED);
    }
  }

  // Sets the data for the FB Contact
  this.setData = function(data) {
    contactData = data;
  }

  Object.defineProperty(this,'uid', {
    get: getFacebookUid,
    set: setFacebookUid,
    enumerable: true,
    configurable: false
  });


  this.save = function() {
    var outReq = null;

    if(contactData && navigator.mozContacts) {
      var contactObj = new mozContact();
      // Info tbe saved on mozContacts
      var contactInfo = {};

      // Copying names to the mozContact
      copyNames(contactData,contactInfo);

      doSetFacebookUid(contactInfo,contactData.uid);

      contactObj.init(contactInfo);

      outReq = new Request();

      window.console.log('About to saving',contactData.uid);

      window.setTimeout(function save_do () {
        var mozContactsReq = navigator.mozContacts.save(contactObj);

        mozContactsReq.onsuccess = function(e) {
          // now saving the FB-originated data to the "private area"
          window.console.log('About to saving on indexedDB',contactData.uid);

          var data = Object.create(contactData.fbInfo);

          data.tel = contactData.tel || [];
          data.email = contactData.email || [];
          data.uid =  contactData.uid;

          Object.keys(contactData.fbInfo).forEach(function(prop) {
            data[prop] = contactData.fbInfo[prop];
          });

          // Names are also stored on indexedDB
          // thus restoring the contact (if unlinked) will be trivial
          copyNames(contactData,data);

          var fbReq = fb.contacts.save(data);

          fbReq.onsuccess = function() {
            window.console.log('OWDSuccess: Saving on indexedDB');

            outReq.done(fbReq.result);
          }
          fbReq.onerror = function() {
            window.console.error('OWDError: Saving on indexedDB');
            outReq.failed(fbReq.error);
          }
        } // mozContactsReq.onsuccess

        mozContactsReq.onerror = function(e) {
          window.console.error('OWDError: mozContacts',e.target.error);
          outReq.failed(mozContactsReq.e.target.error);
        }
      },0);
    }

     return outReq;
  }

  function copyNames(source,destination) {
    destination.name = source.name;
    destination.givenName = source.givenName;
    destination.familyName = source.familyName;
    destination.additionalName = source.additionalName;
  }

  this.merge = function(fbdata) {
    var out = Object.create(devContact);

    Object.keys(devContact).forEach(function(prop) {
      out[prop] = devContact[prop];
    });

    var blackList = ['name','givenName','familyName','additionalName'];

    Object.keys(fbdata).forEach(function(field) {
      if(blackList.indexOf(field) === -1) {
        out[field] = fbdata[field];
      }
    });

    return out;
  }

  this.getData = function() {
    var out;

    var outReq = new Request();

    window.setTimeout(function do_getdata() {
      var fbreq = fb.contacts.get(doGetFacebookUid(devContact));
      fbreq.onsuccess = function() {
        var fbdata = fbreq.result;
        out = this.merge(fbdata);
        outReq.done(out);
      }.bind(this);

      fbreq.onerror = function() {
        outReq.failed(fbreq.error);
      }
    }.bind(this),0);

    return outReq;
  }
}

fb.isFbContact = function(devContact) {
  return (devContact.category
                        && devContact.category.indexOf(fb.CATEGORY) !== -1);
}
