'use strict';

var fb = window.fb || {};
fb.CATEGORY = 'facebook';
fb.NOT_LINKED = 'not_linked';
fb.LINKED = 'fb_linked';

fb.CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

// Encapsulates all the logic to obtain the data for a FB contact
fb.Contact = function(deviceContact, cid) {
  var contactData;
  var devContact = deviceContact;
  var contactid = cid;

  function doGetFacebookUid(data) {
    var out = data.uid;
    if (!out) {
      if (fb.isFbLinked(data)) {
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

  function getFacebookUid() {
    return doGetFacebookUid(deviceContact);
  }

  function setFacebookUid(value) {
    doSetFacebookUid(deviceContact, value);
  }

  function doSetFacebookUid(dcontact, value) {
    if (!dcontact.category) {
      dcontact.category = [];
    }

    if (dcontact.category.indexOf(fb.CATEGORY) === -1) {
      markAsFb(dcontact);
    }

    var idx = dcontact.category.indexOf(fb.CATEGORY);

    dcontact.category[idx + 2] = value;
  }

  function markAsFb(dcontact) {
    if (!dcontact.category) {
      dcontact.category = [];
    }

    if (dcontact.category.indexOf(fb.CATEGORY) === -1) {
      dcontact.category.push(fb.CATEGORY);
      dcontact.category.push(fb.NOT_LINKED);
    }

    return dcontact;
  }

  // Mark a mozContact (deviceContact) as linked to a FB contact (uid)
  function markAsLinked(dcontact, uid) {
    if (!dcontact.category) {
      dcontact.category = [];
    }

    if (dcontact.category.indexOf(fb.LINKED) === -1) {
      dcontact.category.push(fb.CATEGORY);
      dcontact.category.push(fb.LINKED);
      dcontact.category.push(uid);
    }

    return dcontact;
  }

  function promoteToLinked(dcontact) {
    var idx = dcontact.category.indexOf(fb.NOT_LINKED);

    if (idx != -1) {
      dcontact.category[idx] = fb.LINKED;
    }
  }

  // The contact is now totally unlinked
  // [...,facebook, fb_not_linked, 123456,....]
  function markAsUnlinked(dcontact) {
    var category = dcontact.category;
    var updatedCategory = [];

    if (category) {
      var idx = category.indexOf(fb.CATEGORY);
      if (idx !== -1) {
        for (var c = 0; c < idx; c++) {
          updatedCategory.push(category[c]);
        }
        // The facebook category, the linked mark and the UID are skipped
        for (var c = idx + 3; c < category.length; c++) {
           updatedCategory.push(category[c]);
        }
      }
    }

    dcontact.category = updatedCategory;

    return dcontact;
  }

  // Sets the data for an imported FB Contact
  this.setData = function(data) {
    contactData = data;
  }

  Object.defineProperty(this, 'uid', {
    get: getFacebookUid,
    set: setFacebookUid,
    enumerable: true,
    configurable: false
  });

  Object.defineProperty(this, 'mozContact', {
    get: getDevContact
  });

  function getDevContact() {
    return devContact;
  }

  // For saving an imported FB contact
  this.save = function() {
    var outReq = new fb.utils.Request();

    if (contactData && navigator.mozContacts) {
      window.setTimeout(function save_do() {
        var contactObj = new mozContact();
        // Info tbe saved on mozContacts
        var contactInfo = {};

        // Copying names to the mozContact
        copyNames(contactData, contactInfo);

        doSetFacebookUid(contactInfo, contactData.uid);

        contactObj.init(contactInfo);

        var mozContactsReq = navigator.mozContacts.save(contactObj);

        mozContactsReq.onsuccess = function(e) {
          // now saving the FB-originated data to the "private area"
          var data = Object.create(contactData.fbInfo);

          data.tel = contactData.tel || [];
          data.email = contactData.email || [];
          data.uid = contactData.uid;

          Object.keys(contactData.fbInfo).forEach(function(prop) {
            data[prop] = contactData.fbInfo[prop];
          });

          // Names are also stored on indexedDB
          // thus restoring the contact (if unlinked) will be trivial
          copyNames(contactData, data);

          var fbReq = fb.contacts.save(data);

          fbReq.onsuccess = function() {
            outReq.done(fbReq.result);
          }
          fbReq.onerror = function() {
            window.console.error('FB: Error while saving on indexedDB');
            outReq.failed(fbReq.error);
          }
        } // mozContactsReq.onsuccess

        mozContactsReq.onerror = function(e) {
          window.console.error('FB: Error while saving on mozContacts',
                                                            e.target.error);
          outReq.failed(e.target.error);
        }
      },0);
    }
    else {
      throw 'Data or mozContacts not available';
    }

     return outReq;
  }

  function copyNames(source, destination) {
    destination.name = source.name;
    destination.givenName = source.givenName;
    destination.familyName = source.familyName;
    destination.additionalName = source.additionalName;
  }

  // Merges mozContact data with Facebook data
  this.merge = function(fbdata) {
    var out = devContact;

    if (fbdata) {
      out = Object.create(devContact);

      Object.keys(devContact).forEach(function(prop) {
        if (devContact[prop] &&
                              typeof devContact[prop].forEach === 'function') {
          out[prop] = [];
          out[prop] = out[prop].concat(devContact[prop]);
        }
        else if (devContact[prop]) {
          out[prop] = devContact[prop];
        }
      });

      mergeFbData(out, fbdata);
    }

    return out;
  }

  function mergeFbData(dcontact, fbdata) {
    var multipleFields = ['email', 'tel', 'photo', 'org'];

    multipleFields.forEach(function(field) {
      if (!dcontact[field]) {
        dcontact[field] = [];
      }
      var items = fbdata[field];
      if (items) {
        items.forEach(function(item) {
          dcontact[field].push(item);
        });
      }
    });

    var singleFields = ['bday'];
    singleFields.forEach(function(field) {
      dcontact[field] = fbdata[field];
    });

  }

  // Gets the data
  this.getData = function() {

    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = function() {
          var fbdata = fbreq.result;
          var out = this.merge(fbdata);
          outReq.done(out);

        }.bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        }
      }
      else {
        outReq.done(devContact);
      }
    }.bind(this), 0);

    return outReq;
  }


  this.getDataAndValues = function() {
    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = function() {
          var fbdata = fbreq.result;

          var out1 = this.merge(fbdata);

          var out2 = {};

          Object.keys(fbdata).forEach(function(key) {
            var dataElement = fbdata[key];

            if (dataElement && typeof dataElement.forEach === 'function' &&
                key !== 'photo') {
              dataElement.forEach(function(item) {
                if (item.value && item.value.length > 0) {
                  out2[item.value] = 'p';
                }
                else if (typeof item === 'string' && item.length > 0) {
                  out2[item] = 'p';
                }
              });
            }
            else if (key === 'photo') {
              out2['hasPhoto'] = true;
            }
            else if (dataElement) {
              out2[dataElement] = 'p';
            }
          });

          outReq.done([out1, out2]);

        }.bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        }
      }
      else {
        outReq.done([devContact, {}]);
      }
    }.bind(this), 0);

    return outReq;
  }

  this.promoteToLinked = function() {
    promoteToLinked(devContact);
  }

  this.linkTo = function(fbFriend) {
    var out = new fb.utils.Request();

    window.setTimeout(function do_linkTo() {
      if (!devContact) {
        // We need to get the Contact data
        var req = fb.utils.getContactData(contactid);

        req.onsuccess = function() {
          devContact = req.result;
          doLink(devContact, fbFriend, out);
        } // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        }
      } // devContact
      else {
        doLink(devContact, fbFriend, out);
      }
    },0);

    return out;
  }

  function doLink(contactdata, fbFriend, out) {
    if (contactdata) {
      if (fbFriend.uid) {
        markAsLinked(contactdata, fbFriend.uid);
      }
      else if (fbFriend.mozContact) {
        markAsLinked(contactdata, doGetFacebookUid(fbFriend.mozContact));
      }

      var mozContactsReq = navigator.mozContacts.save(contactdata);

      mozContactsReq.onsuccess = function(e) {
        // The FB contact on mozContacts needs to be removed
        if (fbFriend.mozContact) {
          var deleteReq = navigator.mozContacts.remove(fbFriend.mozContact);

          deleteReq.onsuccess = function(e) {
            out.done(e.target.result);
          }

          deleteReq.onerror = function(e) {
            window.console.error('FB: Error while linking');
            out.failed(e.target.error);
          }
        }
        else {
          out.done(e.target.result);
        }
      } // mozContactsReq.onsuccess

      mozContactsReq.onerror = function(e) {
        out.failed(e.target.error);
      } // mozContactsReq.onerror
    } // if(dev.contact)
    else {
      throw 'FB: Contact data not defined';
    }
  }

  this.unlink = function() {
    var out = new fb.utils.Request();

    window.setTimeout(function do_unlink() {
      if (!devContact) {
        // We need to get the Contact data
        var req = fb.utils.getContactData(contactid);

        req.onsuccess = function() {
          devContact = req.result;
          doUnlink(devContact, out);
        } // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        }
      } // devContact
      else {
        doUnlink(devContact, out);
      }
    }, 0);

    return out;
  }

  function doUnlink(dContact, out) {
    var uid = doGetFacebookUid(dContact);

    markAsUnlinked(dContact);
    var req = navigator.mozContacts.save(dContact);

    req.onsuccess = function(e) {
      // Then the original FB imported contact is restored
      var fbDataReq = fb.contacts.get(uid);

      fbDataReq.onsuccess = function() {
        var imported = fbDataReq.result;

        var data = {};
        copyNames(imported, data);
        doSetFacebookUid(data, uid);

        var mcontact = new mozContact();
        mcontact.init(data);

        // The FB contact is restored
        var reqRestore = navigator.mozContacts.save(mcontact);

        reqRestore.onsuccess = function(e) {
          out.done(mcontact.id);
        }

        reqRestore.onerror = function(e) {
          out.failed(e.target.error);
        }
      }

      fbDataReq.onerror = function() {
        window.console.error('FB: Error while unlinking contact data');
        out.failed(fbDataReq.error);
      }
    }

    req.onerror = function(e) {
      out.failed(e.target.error);
    }
  }

  this.remove = function() {
    var out = new fb.utils.Request();

    window.setTimeout(function do_remove() {
      var uid = doGetFacebookUid(devContact);

      var removeReq = navigator.mozContacts.remove(devContact);
      removeReq.onsuccess = function(e) {
        var fbReq = fb.contacts.remove(uid);
        fbReq.onsuccess = function() {
          out.done(fbReq.result);
        }

        fbReq.onerror = function() {
          out.failed(fbReq.error);
        }
      }

      removeReq.onerror = function(e) {
        out.failed(e.target.error);
      }
    }, 0);

    return out;
  }

}; // fb.Contact


fb.isFbContact = function(devContact) {
  return (devContact.category &&
                        devContact.category.indexOf(fb.CATEGORY) !== -1);
};


fb.isFbLinked = function(devContact) {
  return (devContact.category &&
                        devContact.category.indexOf(fb.LINKED) !== -1);
};
