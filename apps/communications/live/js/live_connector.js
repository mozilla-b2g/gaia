if (!window.LiveConnector) {
  window.LiveConnector = (function() {
    var LIVE_ENDPOINT = 'https://apis.live.net/v5.0/';
    var CONTACTS_RESOURCE = 'me/contacts';
    var PICTURE_RESOURCE = '/picture';

    var LIVE_CATEGORY = 'live';

    var itemsTypeMap = {
      'personal': 'personal',
      'mobile': 'mobile',
      'business': 'work',
      'other': 'other',
      'preferred': 'personal'
    };

    function fillAddress(addrType, addrValue) {
      var out = {
        type: [addrType],
        streetAddress: addrValue.street || '',
        locality: addrValue.city || '',
        region: addrValue.state || '',
        countryName: addrValue.region || '',
        postalCode: addrValue.postal_code || ''
      };

      return out;
    }

    function getURI(liveContact) {
      return 'urn:uuid:' + (liveContact.user_id || liveContact.id);
    }

    function resolveURI(uri) {
      var components = uri.split(':');
      // The third element is the user id of the live contact
      return components[2];
    }

    function LiveConnector() {
    }

    LiveConnector.prototype = {
      listAllContacts: function(access_token, callbacks) {
        var uriElements = [LIVE_ENDPOINT, CONTACTS_RESOURCE, '?',
                           'access_token', '=', access_token];

        return Rest.get(uriElements.join(''), callbacks);
      },

      listDeviceContacts: function(callbacks) {
        var filterOptions = {
          filterValue: LIVE_CATEGORY,
          filterOp: 'contains',
          filterBy: ['category']
        };
        var req = navigator.mozContacts.find(filterOptions);
        req.onsuccess = function() {
          callbacks.success(req.result);
        };
        req.onerror = function() {
          callbacks.error(req.error);
        };
      },

      getImporter: function(contactsList, access_token) {
        return new window.ContactsImporter(contactsList, access_token, this);
      },

      cleanContacts: function(contactsList, mode, cb) {
        // Just a placeholder for the moment
        var cleaner = new window.ContactsCleaner(contactsList);
        window.setTimeout(cleaner.start, 0);
        cb(cleaner);
      },

      adaptDataForShowing: function(source) {
        var out = source;

        out.uid = source.user_id || source.id;
        out.givenName = [source.first_name || ''];
        out.familyName = [source.last_name || ''];
        out.email1 = source.emails.account || '';

        out.contactPictureUri = [LIVE_ENDPOINT, out.uid,
                                 PICTURE_RESOURCE, '?type=medium'].join('');

        return out;
      },

      adaptDataForSaving: function live2MozContact(liveContact) {
        var out = {
          givenName: [liveContact.first_name || ''],
          familyName: [liveContact.last_name || ''],
          name: [liveContact.name || ''],
          tel: [],
          email: [],
          adr: [],
          photo: liveContact.photo,
          category: [LIVE_CATEGORY],
          url: [{
            type: ['source'],
            value: getURI(liveContact)
          }]
        };

        var byear = liveContact.birth_year;
        var bmonth = liveContact.birth_month;
        var bday = liveContact.birth_day;
        if (bmonth && bday) {
          var birthdate = out.bday = new Date();
          birthdate.setUTCDate(bday);
          birthdate.setUTCMonth(bmonth, bday);
          if (byear) {
            birthdate.setUTCFullYear(byear);
          }
        }

        var liveEmails = liveContact.emails || {};
        var alreadyAddedEmails = {};
        Object.keys(liveEmails).forEach(function(emailType) {
          var emailValue = liveEmails[emailType];
          var present = (typeof alreadyAddedEmails[emailValue] === 'boolean');
          if (emailValue && !present) {
            out.email.push({
              type: [itemsTypeMap[emailType]],
              value: emailValue
            });
            alreadyAddedEmails[emailValue] = true;
          }
        });

        var livePhones = liveContact.phones || {};
        Object.keys(livePhones).forEach(function(phoneType) {
          var phoneValue = livePhones[phoneType];
          if (phoneValue) {
            out.tel.push({
              type: [itemsTypeMap[phoneType]],
              value: phoneValue
            });
          }
        });

        var liveAddresses = liveContact.addresses || {};
        Object.keys(liveAddresses).forEach(function(addrType) {
          var addrValue = liveAddresses[addrType];
          if (addrValue) {
            out.adr.push(fillAddress(itemsTypeMap[addrType], addrValue));
          }
        });

        return out;
      },

      // It would allow to know the UID of a service contact already imported
      // on the device. That is needed by the generic importer, for live
      // a dummy implementation as we are currently not supporting updates
      getContactUid: function(deviceContact) {
        var out = '-1';

        var url = deviceContact.url;
        if (Array.isArray(url)) {
          var targetUrls = url.filter(function(aUrl) {
            return Array.isArray(aUrl.type) &&
                                aUrl.type.indexOf('source') !== -1;
          });
          if (targetUrls[0]) {
            out = resolveURI(targetUrls[0].value);
          }
        }

        return out;
      },

      get name() {
        return 'live';
      },

      get automaticLogout() {
        return true;
      },

      downloadContactPicture: function(contact, access_token, callbacks) {
        if (contact.user_id) {
          var uriElements = [LIVE_ENDPOINT, contact.user_id, PICTURE_RESOURCE,
                             '?', 'access_token', '=', access_token];

          return Rest.get(uriElements.join(''), callbacks, {
            responseType: 'blob'
          });
        }
        else {
          callbacks.success(null);
        }
      },

      startSync: function() {
        // Sync not supported
      }
    };

    return new LiveConnector();
  })();
}
