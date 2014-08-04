'use strict';

// Includes convenience functions for FB Contact Data
// To use this library you need to include:
// 'shared/js/fb/fb_request.js' and 'shared/js/fb/fb_data_reader.js'

var fb = this.fb || {};
this.fb = fb;

if (!this.AuxFB) {
  this.AuxFb = (function() {
    var CATEGORY = 'facebook';
    var NOT_LINKED = 'not_linked';
    var LINKED = 'fb_linked';

    // Shallow copy from source to target object
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

    // Auxiliary function for merging
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

      var singleFields = ['bday', 'anniversary'];
      singleFields.forEach(function(field) {
        if (!dcontact[field]) {
          dcontact[field] = fbdata[field];
        }
      });

      // To support the case in which the contact does not have a local name
      mergeNames(dcontact, fbdata);
    }

    // Auxiliary function for merging names
    function mergeNames(devContact, fbContact) {
      var namesChanged = false;
      var nameFields = ['givenName', 'familyName'];
      nameFields.forEach(function(anameField) {
        // If the device contact does not have name fields setted
        // we use the Facebook ones
        var fieldValue = devContact[anameField];
        var fbValue = fbContact[anameField];
        if ((!Array.isArray(fieldValue) || fieldValue.length === 0) &&
            Array.isArray(fbValue) && fbValue.length > 0) {
          namesChanged = true;
          devContact[anameField] = (fieldValue && fieldValue[0]) || [];
          devContact[anameField].push(fbValue[0]);
        }
      });

      if (namesChanged) {
        var givenName = devContact.givenName[0] || '';
        var familyName = devContact.familyName[0] || '';
        devContact.name = [givenName + ' ' + familyName];
      }
    }

    /**
     *  Returns truthy if the device contact is a FB Friend
     *
     */
    function isFbContact(devContact) {
      return (devContact && devContact.category &&
            devContact.category.indexOf(CATEGORY) !== -1);
    }


    /**
     *  Returns truthy if the device contact is linked to a FB Friend
     *
     */
    function isFbLinked(devContact) {
      return (devContact && devContact.category &&
                          devContact.category.indexOf(LINKED) !== -1);
    }

    /**
     * Gets all the data enriching the local contact with FB information
     *
     */
    function getData(devContact) {
      var outReq = new fb.utils.Request();

      window.setTimeout(function do_getData() {
        var uid = getFriendUid(devContact);

        if (uid) {
          var fbreq = fb.contacts.get(uid);

          fbreq.onsuccess = function() {
            var fbdata = fbreq.result;
            var out = mergeContact(devContact, fbdata);
            outReq.done(out);

          };

          fbreq.onerror = function() {
            outReq.failed(fbreq.error);
          };
        }
        else {
          outReq.done(devContact);
        }
      }, 0);

      return outReq;
    }

    /**
     *  Returns the FB Friend UID associated to a device contact
     *
     */
    function getFriendUid(devContact) {
      var out = devContact.uid;

      if (!out) {
        if (isFbLinked(devContact)) {
          out = getLinkedTo(devContact);
        }
        else if (devContact.category) {
          var idx = devContact.category.indexOf(CATEGORY);
          if (idx !== -1) {
            out = devContact.category[idx + 2];
          }
        }
      }

      return out;
    }

    /**
     *  Gets the UID of the FB Friend a device contact is linked to
     *
     */
    function getLinkedTo(devContact) {
      var out;

      if (devContact.category) {
        var idx = devContact.category.indexOf(LINKED);
        if (idx !== -1) {
          out = devContact.category[idx + 1];
        }
      }

      return out;
    }

    /**
     *  Merge a device contact with a FB Friend
     *
     */
    function mergeContact(devContact, fbContact) {
      var out = devContact;

      if (fbContact) {
        out = Object.create(null);
        out.updated = devContact.updated;
        out.published = devContact.published;

        // The id comes from devContact and the rest of properties like
        // familyName, propertyName, etc... are defined in the proto object
        populate(devContact, out, Object.getOwnPropertyNames(devContact));
        populate(devContact, out,
              Object.getOwnPropertyNames(Object.getPrototypeOf(devContact)));

        mergeFbData(out, fbContact);
      }

      return out;
    }

    /**
     *  Returns a FB Contact (enriched with FB info) which has the tel number
     *
     */
    function getContactByNumber(number, onsuccess, onerror) {
      var req = fb.contacts.getByPhone(number);

      req.onsuccess = function get_by_phone_success(e) {
        var fbData = req.result;
        if (fbData) {
          fb.getMozContactByUid(fbData.uid, function merge(result) {
            if (Array.isArray(result) && result[0]) {
              var finalContact = fb.mergeContact(result[0], fbData);
              onsuccess(finalContact);
            }
            else {
              onsuccess(null);
            }
          }, function error_get_mozContact(err) {
              console.error('Error getting mozContact: ', err.name);
              onerror(err);
          });
        }
        else {
          onsuccess(null);
        }
      };

      req.onerror = function() {
        onerror(req.error);
      };
    }

    // Checks whether there is a duplicate for the field value
    // both in FB and in the local device Contact data
    // Returns an array with the values which are duplicated or empty if
    // no duplicates were found
    // Parameters are: field on which to search, the corresponding fbItem
    // the local device items, and extra FB Items which corresp to the short
    // telephone numbers allowing to filter out dups with intl-ed numbers
    function checkDuplicates(field, fbItem, devContactItems, extraFbItems) {
      var potentialDuplicatesFields = ['email', 'tel'];
      var out = [];

      if (devContactItems &&
          potentialDuplicatesFields.indexOf(field) !== -1) {
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

    /**
     *  Returns the mozContact associated to a certain FB UID
     *
     */
    function getMozContactByUid(uid, onsuccess, onerror) {
      var filter = {
        filterBy: ['category'],
        filterValue: uid,
        filterOp: 'contains'
      };

      var req = navigator.mozContacts.find(filter);
      req.onsuccess = function() {
        onsuccess(req.result);
      };
      req.onerror = function() {
        onerror(req.error);
      };
    }

    return {
      'isFbContact': isFbContact,
      'isFbLinked': isFbLinked,
      'getData': getData,
      'getFriendUid': getFriendUid,
      'getLinkedTo': getLinkedTo,
      'mergeContact': mergeContact,
      'getContactByNumber': getContactByNumber,
      'getMozContactByUid': getMozContactByUid,
      'checkDuplicates': checkDuplicates,
      get CATEGORY() {
        return CATEGORY;
      },
      get LINKED() {
        return LINKED;
      },
      get NOT_LINKED() {
        return NOT_LINKED;
      }
    };
  })();

  // This boilerplate code sets the AuxFb properties to the fb object
  var props = Object.keys(this.AuxFb);
  var self = this;

  for (var j = 0, end = props.length; j < end; j++) {
    var prop = props[j];
    if (typeof self.fb[prop] === 'function') {
      self.fb[prop] = self.AuxFb[prop];
    }
    else {
      Object.defineProperty(self.fb, prop, {
        value: (function() {
          return self.AuxFb[prop];
        })(), writable: false, enumerable: true, configurable: false
      });
    }
  }
}
