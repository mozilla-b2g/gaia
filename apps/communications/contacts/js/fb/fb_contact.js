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

  // Sets the data for an imported FB Contact
  this.setData = function(data) {
    contactData = data;
  };

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
        var photoList = contactData.fbInfo.photo;
        if (photoList && photoList.length > 0 && photoList[0]) {
          utils.squareImage(photoList[0], function squared(squared_image) {
            photoList[0] = squared_image;
            doSave(outReq);
          });
        }
        else {
          doSave(outReq);
        }
      },0);
    }
    else {
      throw 'Data or mozContacts not available';
    }

    return outReq;
  };

  function doSave(outReq) {
    // Info to be saved on mozContacts
    var contactInfo = {};

    // Copying names to the mozContact
    copyNames(contactData, contactInfo);
    // URL (photo, etc) is stored also with the Device contact
    if (contactData.fbInfo.url) {
      contactInfo.url = contactData.fbInfo.url;
    }

    doSetFacebookUid(contactInfo, contactData.uid);

    var contactObj = new mozContact(contactInfo);

    var fbReq = persistToFbCache(contactData);

    fbReq.onsuccess = function() {
      var mozContactsReq = navigator.mozContacts.save(contactObj);
      mozContactsReq.onsuccess = function(e) {
        outReq.done(fbReq.result);
      };
      mozContactsReq.onerror = function(e) {
        window.console.error('FB: Error while saving on mozContacts',
                                                        e.target.error);
        outReq.failed(e.target.error);
      }; // fbReq.onsuccess
    };
    fbReq.onerror = function() {
      window.console.error('FB: Error while saving on indexedDB');
      outReq.failed(fbReq.error);
    };
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
      };
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving on indexedDB');
        outReq.failed(fbReq.error);
      };
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
        };
        dataReq.onerror = function() {
          window.console.error('Error while retrieving existing photo for ',
                               contactData.uid, dataReq.error);
          outReq.failed(dataReq.error);
        };
      }
      else {
        utils.squareImage(contactData.fbInfo.photo[0],
          function sq_img(squaredImg) {
            contactData.fbInfo.photo[0] = squaredImg;
            auxCachePersist(contactData, outReq);
          }
        );
      }
    }

    // Persist the data to the FB Cache
    function auxCachePersist(contactData, outReq) {
      var fbReq = persistToFbCache(contactData);

      fbReq.onsuccess = function() {
        outReq.done(fbReq.result);
      };
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving to FB cache: ',
                             contactData.uid, fbReq.error);
        outReq.failed(fbReq.error);
      };
    }

    // Code starts here
    var outReq = new fb.utils.Request();

    window.setTimeout(function update_do() {
      if (!fb.isFbLinked(devContact)) {
        copyNames(contactData, devContact);
      } else {
        // We are going to update names if they are propagated
        revisitPropagatedNames(contactData, devContact);
      }

      // Check whether the photo has changed
      if (contactData.fbInfo.photo) {
        devContact.url = contactData.fbInfo.url;
      }

      var auxReq = new fb.utils.Request();
      auxReq.onsuccess = function() {
        var mozContactsReq = navigator.mozContacts.save(devContact);
        mozContactsReq.onsuccess = function(e) {
          outReq.done();
        };

        mozContactsReq.onerror = function(e) {
          window.console.error('FB: Error while saving mozContact: ',
                             devContact.id, e.target.error);
          outReq.failed(e.target.error);
        };
      };  // auxReq.onsuccess

      auxReq.onerror = function(e) {
        outReq.failed(e.target.error);
      };  // auxReq.onerror

      // And now doing the update
      auxDoUpdate(contactData, auxReq);
    },0);

    return outReq;
  };

  function asArrayOfValues(value) {
    return Array.isArray(value) ? value : [value];
  }

  function copyNames(source, destination) {
    destination.name = asArrayOfValues(source.name);
    destination.givenName = asArrayOfValues(source.givenName);
    destination.familyName = asArrayOfValues(source.familyName);
    destination.additionalName = asArrayOfValues(source.additionalName);
  }

  /*
   * Shallow copy from source to target object
   */
  function populate(source, target, propertyNames) {
    propertyNames.forEach(function(property) {
      var propertyValue = source[property];
      if (propertyValue) {
        if (Array.isArray(propertyValue)) {
          target[property] = propertyValue.slice(0, propertyValue.length);
        } else {
          target[property] = propertyValue;
        }
      }
    });
  }

  // Merges mozContact data with Facebook data
  this.merge = function(fbdata) {
    var out = devContact;

    if (fbdata) {
      out = Object.create(null);
      out.updated = devContact.updated;
      out.published = devContact.published;

      // The id comes from devContact and the rest of properties like
      // familyName, propertyName, etc... are defined in the prototype object
      populate(devContact, out, Object.getOwnPropertyNames(devContact));
      populate(devContact, out,
                 Object.getOwnPropertyNames(Object.getPrototypeOf(devContact)));

      mergeFbData(out, fbdata);
    }

    return out;
  };


  // Checks whether there is a duplicate for the field value
  // both in FB and in the local device Contact data
  // Returns an array with the values which are duplicated or empty if
  // no duplicates were found
  // Parameters are: field on which to search, the corresponding fbItem
  // the local device items, and extra FB Items which correspond to the short
  // telephone numbers allowing to filter out duplicates with intl-ed numbers
  function checkDuplicates(field, fbItem, devContactItems, extraFbItems) {
    var potentialDuplicatesFields = ['email', 'tel'];
    var out = [];

    if (devContactItems && potentialDuplicatesFields.indexOf(field) !== -1) {
      var total = devContactItems.length;
      for (var i = 0; i < total; i++) {
        var localValue = devContactItems[i].value;
        var fbValue = fbItem.value;
        // Checking for telephone international number matching
        if (localValue) {
          var trimedLocal = localValue.trim();
          if (trimedLocal === fbValue ||
             (field === 'tel' && Array.isArray(extraFbItems) &&
              extraFbItems.indexOf(trimedLocal) !== -1)) {
            out.push(trimedLocal);
            out.push(fbValue);
          }
        } // if(localValue)
      } // for
    } // if(devContactItems)

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
          // If there are no duplicates the merge is done
          var dupList = checkDuplicates(field, item, dcontact[field],
                                        fbdata.shortTelephone);
          if (dupList.length === 0) {
            dcontact[field].push(item);
          }
        });
      }
    });

    var singleFields = ['bday'];
    singleFields.forEach(function(field) {
      dcontact[field] = fbdata[field];
    });

    // To support the case in which the contact does not have a local name
    fb.mergeNames(dcontact, fbdata);
  }

  // Gets the data
  this.getData = function() {

    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = (function() {
          var fbdata = fbreq.result;
          var out = this.merge(fbdata);
          outReq.done(out);

        }).bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        };
      }
      else {
        outReq.done(devContact);
      }
    }.bind(this), 0);

    return outReq;
  };


  this.getDataAndValues = function() {
    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = (function() {
          var fbdata = fbreq.result;

          var out1 = this.merge(fbdata);

          var out2 = {};

          var duplicates = {};
          Object.keys(fbdata).forEach(function(key) {
            var dataElement = fbdata[key];

            if (dataElement && Array.isArray(dataElement) && key !== 'photo') {
              dataElement.forEach(function(item) {
                if (item.value && item.value.length > 0) {
                  // Check for duplicates. Those duplicates are annotated to
                  // be later removed from the out2 array
                  var dupList = checkDuplicates(key, item, devContact[key],
                                                      fbdata.shortTelephone);
                  dupList.forEach(function(aDup) {
                    duplicates[aDup] = true;
                  });

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

          Object.keys(duplicates).forEach(function(aDup) {
            delete out2[aDup];
          });

          outReq.done([out1, out2, fbdata]);

        }).bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        };
      }
      else {
        outReq.done([devContact, {}]);
      }
    }.bind(this), 0);

    return outReq;
  };

  this.promoteToLinked = function() {
    promoteToLinked(devContact);
  };

  this.linkTo = function(fbFriend) {
    var out = new fb.utils.Request();

    window.setTimeout(function do_linkTo() {
      if (!devContact) {
        // We need to get the Contact data
        var req = fb.utils.getContactData(contactid);

        req.onsuccess = function() {
          devContact = req.result;
          doLink(devContact, fbFriend, out);
        }; // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        };
      } // devContact
      else {
        doLink(devContact, fbFriend, out);
      }
    },0);

    return out;
  };

  function propagateField(field, from, to) {
    var copied = false;

    // The field is copied when it is undefined in the target object
    if (!Array.isArray(to[field]) || !to[field][0] || !to[field][0].trim()) {
      to[field] = from[field];
      copied = true;
    }

    return copied;
  }

  function createName(contact) {
    contact.name = [];

    if (Array.isArray(contact.givenName)) {
      contact.name[0] = contact.givenName[0] + ' ';
    }

    if (Array.isArray(contact.familyName))
      contact.name[0] += contact.familyName[0];
  }

  function propagateNames(from, to) {
    var isGivenNamePropagated = propagateField('givenName', from, to);
    var isFamilyNamePropagated = propagateField('familyName', from, to);

    if (isGivenNamePropagated || isFamilyNamePropagated) {
      //  We are going to mark the propagation in the category field
      if (isGivenNamePropagated)
        fb.setPropagatedFlag('givenName', to);

      if (isFamilyNamePropagated)
        fb.setPropagatedFlag('familyName', to);

      createName(to);
    }
  }

  // This method copies names to a contact when they are propagated from fb
  function revisitPropagatedNames(from, to) {
    if (fb.isPropagated('givenName', to))
      to['givenName'] = from['givenName'];

    if (fb.isPropagated('familyName', to))
      to['familyName'] = from['familyName'];

    createName(to);
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

      propagateNames(fbFriend.mozContact, contactdata);
      var mozContactsReq = navigator.mozContacts.save(contactdata);

      mozContactsReq.onsuccess = function(e) {
        // The FB contact on mozContacts needs to be removed
        if (fbFriend.mozContact && !fb.isFbLinked(fbFriend.mozContact)) {
          var theContact = (fbFriend.mozContact instanceof mozContact) ?
                           fbFriend.mozContact :
                           new mozContact(fbFriend.mozContact);
          var deleteReq = navigator.mozContacts.remove(theContact);

          deleteReq.onsuccess = function(e) {
            out.done(e.target.result);
          };

          deleteReq.onerror = function(e) {
            window.console.error('FB: Error while linking');
            out.failed(e.target.error);
          };
        }
        else {
          out.done(e.target.result);
        }

      }; // mozContactsReq.onsuccess

      mozContactsReq.onerror = function(e) {
        out.failed(e.target.error);
      }; // mozContactsReq.onerror
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
        }; // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        };
      } // devContact
      else {
        doUnlink(devContact, out, type);
      }
    }, 0);

    return out;
  };

  // Reset givenName and familyName if it is needed after unlinking
  function resetNames(dContact) {
    if (fb.isPropagated('givenName', dContact)) {
      dContact.givenName = [''];
      fb.removePropagatedFlag('givenName', dContact);
    }

    if (fb.isPropagated('familyName', dContact)) {
      dContact.familyName = [''];
      fb.removePropagatedFlag('familyName', dContact);
    }

    dContact.name = [dContact.givenName[0] + ' ' + dContact.familyName[0]];
  }

  function doUnlink(dContact, out, type) {
    var theType = type || 'soft';
    var uid = doGetFacebookUid(dContact);

    resetNames(dContact);
    fb.markAsUnlinked(dContact);
    var req = navigator.mozContacts.save(dContact);

    req.onsuccess = function(e) {
      if (theType !== 'hard') {

        // Then the original FB imported contact is restored
        var fbNumReq = fb.utils.getNumberMozContacts(uid);

        fbNumReq.onsuccess = function() {
          // Because we have already unlinked one
          if (fbNumReq.result >= 1) {
            out.done();
          } else {
            var fbDataReq = fb.contacts.get(uid);

            fbDataReq.onsuccess = function() {
              var imported = fbDataReq.result;

              var data = {};
              copyNames(imported, data);
              data.url = imported.url;
              doSetFacebookUid(data, uid);

              var mcontact = new mozContact(data);

              // The FB contact is restored
              var reqRestore = navigator.mozContacts.save(mcontact);

              reqRestore.onsuccess = function(e) {
                out.done(mcontact.id);
              };

              reqRestore.onerror = function(e) {
                out.failed(e.target.error);
              };
            };

            fbDataReq.onerror = function() {
              window.console.error('FB: Error while unlinking contact data');
              out.failed(fbDataReq.error);
            };
          }
        };

        fbNumReq.onerror = function() {
          window.console.error('FB: Error while unlinking contact data');
          out.failed(fbDataReq.error);
        };
      }
      else {
        // FB Data is removed from the cache
        var removeReq = fb.contacts.remove(uid);

        removeReq.onsuccess = function() {
          out.done(removeReq.result);
        };

        removeReq.onerror = function() {
          out.failed(removeReq.error);
        };
      }
    };

    req.onerror = function(e) {
      out.failed(e.target.error);
    };
  }

  this.remove = function() {
    var out = new fb.utils.Request();

    window.setTimeout(function do_remove() {
      var uid = doGetFacebookUid(devContact);

      var fbNumReq = fb.utils.getNumberMozContacts(uid);
      fbNumReq.onsuccess = function num_onsuccess() {
        // If there is only one Device Contact associated
        // Then corresponding FB Data is removed otherwise only
        // the device contact is removed
        if (fbNumReq.result === 1) {
          var theContact = new mozContact(devContact);
          var removeReq = navigator.mozContacts.remove(theContact);
          removeReq.onsuccess = function(e) {
            var fbReq = fb.contacts.remove(uid);
            fbReq.onsuccess = function() {
              out.done(fbReq.result);
            };

            fbReq.onerror = function() {
              out.failed(fbReq.error);
            };
          };
          removeReq.onerror = function(e) {
            out.failed(e.target.error);
          };
        }
        else {
          var theContact = new mozContact(devContact);
          var removeReq = navigator.mozContacts.remove(theContact);
          removeReq.onsuccess = function(e) {
            out.done();
          };
          removeReq.onerror = function(e) {
            out.failed(e.target.error);
          };
        }
      };
    }, 0);

    return out;
  };

}; // fb.Contact
