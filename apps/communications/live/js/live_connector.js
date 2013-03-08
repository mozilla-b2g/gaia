if (!window.LiveConnector) {
  window.LiveConnector = (function() {
    var LIVE_ENDPOINT = 'https://apis.live.net/v5.0/';
    var CONTACTS_RESOURCE = 'me/contacts';
    var PICTURE_RESOURCE = '/picture';

    var itemsTypeMap = {
      'personal': 'personal',
      'mobile': 'mobile',
      'business': 'work',
      'other': 'another',
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


    function LiveConnector() {
    }

    function sortContacts(contactsList) {
      contactsList.sort(function(a, b) {
        var out = 0;
        if (a.last_name && b.last_name) {
          out = a.last_name.localeCompare(b.last_name);
        }
        else if (b.last_name) {
          out = 1;
        }
        else if (a.last_name) {
          out = -1;
        }
        return out;
      });
    }

    LiveConnector.prototype = {
      listAllContacts: function(access_token, callbacks) {
        var uriElements = [LIVE_ENDPOINT, CONTACTS_RESOURCE, '?',
                           'access_token', '=', access_token];

        // Need to be sorted by the connector
        var auxCbs = {
          success: function(response) {
            sortContacts(response.data);
            callbacks.success(response);
          },
          error: callbacks.error,
          timeout: callbacks.timeout
        };

        return Rest.get(uriElements.join(''), auxCbs);
      },

      listDeviceContacts: function(callbacks) {
        // Dummy implementation for the time being
        callbacks.success([]);
      },

      getImporter: function(contactsList, access_token) {
        return new window.ContactsImporter(contactsList, access_token, this);
      },

      getCleaner: function(contactsList, access_token) {
        // Just a placeholder for the moment
        return null;
      },

      adaptDataForShowing: function(source) {
        var out = source;

        out.uid = source.user_id;
        out.givenName = [source.first_name || ''];
        out.familyName = [source.last_name || ''];
        out.email1 = source.emails.account;

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
          adr: []
        };

        var byear = liveContact.birth_year;
        var bmonth = liveContact.birth_month;
        var bday = liveContact.birth_day;
        if (bmonth && bday) {
          var birthdate = out.bday = new Date();
          birthdate.setDate(bday);
          birthdate.setMonth(bmonth, bday);
          if (byear) {
            birthdate.setYear(byear);
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
        return '-1';
      },

      get name() {
        return 'live';
      },

      downloadContactPicture: function(contact, access_token, callbacks) {
        var uriElements = [LIVE_ENDPOINT, contact.user_id, PICTURE_RESOURCE,
                           '?', 'access_token', '=', access_token];

        return Rest.get(uriElements.join(''), callbacks, {
          responseType: 'blob'
        });
      },

      startSync: function() {
        // Sync not supported
      }
    };

    return new LiveConnector();
  })();
}
