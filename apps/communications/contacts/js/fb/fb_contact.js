'use strict';

var fb = window.fb || {};

// Encapsulates all the logic to obtain the data for a FB contact
fb.Contact = function(deviceContact, cid) {
  var contactData;
  var devContact = deviceContact;
  var contactid = cid;

  function doGetFacebookUid(data) {
    return fb.getFriendUid(data);
  }

  function getLinkedTo(c) {
    return fb.getLinkedTo(c);
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
        // Info to be saved on mozContacts
        var contactInfo = {};

        // Copying names to the mozContact
        copyNames(contactData, contactInfo);
        // URL (photo, etc) is stored also with the Device contact
        if (contactData.fbInfo.url) {
          contactInfo.url = contactData.fbInfo.url;
        }

        doSetFacebookUid(contactInfo, contactData.uid);

        contactObj.init(contactInfo);

        var mozContactsReq = navigator.mozContacts.save(contactObj);

        mozContactsReq.onsuccess = function(e) {
          var fbReq = persistToFbCache(contactData);

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

  // Persists FB Friend Data to the FB cache
  function persistToFbCache(contactData) {
    var outReq = new fb.utils.Request();

    window.setTimeout(function persist_fb_do() {
      // now saving the FB-originated data to the "private cache area"
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
    },0);

    return outReq;
  }

  // Updates a FB Contact
  this.update = function(contactData) {

    // Auxiliary function to do all the work for saving to the FB cache
    function auxDoUpdate(contactData, outReq) {
      // If the photo was not updated it is needed to save it
      if (!contactData.fbInfo.photo) {
        var dataReq = fb.contacts.get(contactData.uid);
        dataReq.onsuccess = function() {
          contactData.fbInfo.photo = dataReq.result.photo;
          auxCachePersist(contactData, outReq);
        }
        dataReq.onerror = function() {
          window.console.error('Error while retrieving existing photo for ',
                               contactData.uid, dataReq.error);
          outReq.failed(dataReq.error);
        }
      }
      else {
        auxCachePersist(contactData, outReq);
      }
    }

    // Persist the data to the FB Cache
    function auxCachePersist(contactData, outReq) {
      var fbReq = persistToFbCache(contactData);

      fbReq.onsuccess = function() {
        outReq.done(fbReq.result);
      }
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving to FB cache: ',
                             contactData.uid, fbReq.error);
        outReq.failed(fbReq.error);
      }
    }

    // Code starts here
    var outReq = new fb.utils.Request();

    window.setTimeout(function update_do() {
      // First an update to the mozContacts DB could be needed
      var updateMozContacts = false;

      if (!fb.isFbLinked(devContact)) {
        copyNames(contactData, devContact);
        updateMozContacts = true;
      }

      // Check whether the photo has changed
      if (contactData.fbInfo.photo) {
        devContact.url = contactData.fbInfo.url;
        updateMozContacts = true;
      }

      if (updateMozContacts) {
        var mozContactsReq = navigator.mozContacts.save(devContact);
        mozContactsReq.onsuccess = function(e) {
          auxDoUpdate(contactData, outReq);
        }

        mozContactsReq.onerror = function(e) {
          window.console.error('FB: Error while saving mozContact: ',
                               devContact.id, e.target.error);
          outReq.failed(e.target.error);
        }
      }
      else {
        auxDoUpdate(contactData, outReq);
      }

    },0);

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
        if (devContact[prop] && Array.isArray(devContact[prop])) {
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
    var multipleFields = ['email', 'tel', 'photo', 'org', 'adr'];

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

            if (dataElement && Array.isArray(dataElement) && key !== 'photo') {
              dataElement.forEach(function(item) {
                if (item.value && item.value.length > 0) {
                  out2[item.value] = true;
                }
                else if (typeof item === 'string' && item.length > 0) {
                  out2[item] = true;
                }
                else if (key === 'adr') {
                  if (item.locality) {
                    out2[item.locality] = true;
                  }
                  if (item.countryName) {
                    out2[item.countryName] = true;
                  }
                }
              });
            }
            else if (key === 'photo') {
              out2['hasPhoto'] = true;
            }
            else if (dataElement) {
              out2[dataElement] = true;
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
        // When marking as linked is needed to store a reference to the profile
        // picture URL
        markAsLinked(contactdata, fbFriend.uid);
        if (fbFriend.photoUrl) {
          fb.setFriendPictureUrl(contactdata, fbFriend.photoUrl);
        }
        else if (fbFriend.mozContact) {
          contactdata.url = fbFriend.mozContact.url;
        }
      }
      else if (fbFriend.mozContact) {
        markAsLinked(contactdata, doGetFacebookUid(fbFriend.mozContact));
        contactdata.url = fbFriend.mozContact.url;
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

  // if type === 'hard' the FB Friend is removed from the cache
  this.unlink = function(type) {
    var out = new fb.utils.Request();

    window.setTimeout(function do_unlink() {
      if (!devContact) {
        // We need to get the Contact data
        var req = fb.utils.getContactData(contactid);

        req.onsuccess = function() {
          devContact = req.result;
          doUnlink(devContact, out, type);
        } // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        }
      } // devContact
      else {
        doUnlink(devContact, out, type);
      }
    }, 0);

    return out;
  }

  function doUnlink(dContact, out, type) {
    var theType = type || 'soft';
    var uid = doGetFacebookUid(dContact);

    markAsUnlinked(dContact);
    var req = navigator.mozContacts.save(dContact);

    req.onsuccess = function(e) {
      if (theType !== 'hard') {

        // Then the original FB imported contact is restored
        var fbDataReq = fb.contacts.get(uid);

        fbDataReq.onsuccess = function() {
          var imported = fbDataReq.result;

          var data = {};
          copyNames(imported, data);
          data.url = imported.url;
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
      else {
        // FB Data is removed from the cache
        var removeReq = fb.contacts.remove(uid);

        removeReq.onsuccess = function() {
          out.done(removeReq.result);
        }

        removeReq.onerror = function() {
          out.failed(removeReq.error);
        }
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
