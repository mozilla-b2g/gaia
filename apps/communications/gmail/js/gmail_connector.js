'use strict';

/*
  Gmail Contacts connector

  Provides the capabilities to connect to the Gmail Contacts service
  and return the contacts on a readable and importable format.
*/
var GmailConnector = (function GmailConnector() {

  // Google contacts service end point,
  // force a huge number of contacts to not paginate :S
  var END_POINT =
    'https://www.google.com/m8/feeds/contacts/default/full/?max-results=10000';
  var GROUPS_END_POINT =
    'https://www.google.com/m8/feeds/groups/default/full/';
  var EXTRA_HEADERS = {
    'GData-Version': '3.0'
  };
  var GD_NAMESPACE = 'http://schemas.google.com/g/2005';

  var CATEGORY = 'gmail';
  var URN_IDENTIFIER = 'urn:service:gmail:uid:';

  // Will be used as a cache for the thumbnail url for each contact
  var photoUrls = {};

  // In some cases we will need the access token, cache a copy
  var accessToken = null;

  // We have a xml response from Google, all the entries in an array,
  // no matter if they are xml entries.
  // Despite of being a node, inject a 'uid' as this will be necessary
  // for the selection
  var nodeListToArray = function nodeListToArray(response) {
    var entries = response.getElementsByTagName('entry');
    var contacts = [];
    var numContacts = entries.length;
    for (var i = 0; i < numContacts; i++) {
      contacts.push(gContactToJson(entries[i]));
    }

    return contacts;
  };

  // Returns the object used to build the headers necesary by the service
  var buildRequestHeaders = function buildRequestHeaders(access_token) {
    var requestHeaders = EXTRA_HEADERS;
    requestHeaders['Authorization'] = 'OAuth ' + access_token;

    return requestHeaders;
  };

  // Gets a list of all contacts giving a valid access token
  var listAllContacts = function listAllContacts(access_token,
    callbacks) {
    // Copy the access_token
    accessToken = access_token;
    photoUrls = {};
    getContactsGroup(access_token, callbacks);
  };

  var getContactsGroup = function getContactsGroup(access_token,
    callbacks) {
    var groupCallbacks = {
      success: function onSuccess(response) {
        // Locate the entry witch systemGroup id is 'Contacts'
        var feed = response.querySelector('feed');
        if (feed === null) {
          callbacks.error();
          return;
        }

        var sgc = feed.querySelector('systemGroup[id="Contacts"]');
        if (sgc !== null) {
           var id = sgc.parentNode.querySelector('id').textContent;
           getContactsByGroup(id, access_token, callbacks);
        } else {
           callbacks.error();
        }
      },
      error: function(e) {
        if (e && e.status === 401) {
          // This is a token expired / invalid token problem
          window.console.warn('GMail Access token expired or invalid. ',
                              'restarting flow!');
          callbacks.success({
            error: {
              code: 190
            }
          });
        }
        else {
          callbacks.error();
        }
      },
      timeout: callbacks.timeout
    };

    return performAPIRequest(GROUPS_END_POINT, groupCallbacks, access_token);
  };

  // Retrieve all the contacts for the specific groupId
  var getContactsByGroup = function getContactsByGroup(groupId, access_token,
    callbacks) {
    var listingCallbacks = {
      success: function onSuccess(response) {
        callbacks.success({
          'data': nodeListToArray(response)
        });
      },
      error: callbacks.error,
      timeout: callbacks.timeout
    };

    var groupUrl = END_POINT + '&group=' + groupId;
    return performAPIRequest(groupUrl, listingCallbacks, access_token);
  };

  // Given a Google contacts api url add the authentication and
  // extra headers to perform the correct request
  var performAPIRequest = function performAPIRequest(url, callbacks,
    access_token) {
    return Rest.get(url, callbacks, {
      'requestHeaders': buildRequestHeaders(access_token),
      'responseType': 'xml'
    });
  };

  // Return the list of contacts on the device imported using this connector
  var listDeviceContacts = function listDeviceContacts(callbacks) {
    var filterOptions = {
      filterValue: CATEGORY,
      filterOp: 'contains',
      filterBy: ['category']
    };

    var req = navigator.mozContacts.find(filterOptions);
    req.onsuccess = function() {
      callbacks.success(req.result);
    };
    req.onerror = function onError() {
      callbacks.success([]);
    };
  };

  var getImporter = function getImporter(contactsList, access_token) {
    return new window.ContactsImporter(contactsList, access_token, this);
  };

  var cleanContacts = function cleanContacts(contactsList, mode, cb) {
    var cleaner = new window.ContactsCleaner(contactsList);
    window.setTimeout(cleaner.start, 0);
    if (cb) {
      cb(cleaner);
    }
  };

  var getValueForNode = function getValueForNode(doc, name, def) {
    var defaultValue = def || '';

    if (doc == null || name == null) {
      return defaultValue;
    }

    var node = doc.querySelector(name);

    if (node && node.textContent) {
      return node.textContent;
    }

    return defaultValue;
  };

  /*
    Given an xml contact entry from gmail contacts we will need to output
    a json object that contains the minimun viable information to display
    that contact into a list.

    The fields for that minimun visualization object are:
    uid
    givenName
    familyName
    email1
  */
  var adaptDataForShowing = function adaptDataForShowing(contact) {
    var output = {
      'uid': '-1',
      'givenName': '',
      'familyName': '',
      'email1': '',
      'contactPictureUri': ''
    };

    output.uid = contact.uid;

    if (contact.familyName) {
      output.familyName = contact.familyName;
    }

    if (contact.email && contact.email.length > 0) {
      output.email1 = contact.email[0].value;
    }
    var tel;
    if (contact.tel && contact.tel.length > 0) {
      tel = contact.tel[0].value;
    }
    output.givenName = contact.givenName || tel ||
                                            output.email1 || contact.org || '';

    var photoUrl = buildContactPhotoURL(contact, accessToken);
    if (photoUrl) {
      output.contactPictureUri = photoUrl;
    }

    return output;
  };

  var adaptDataForSaving = function adaptDataForSaving(contact) {
    return contact;
  };

  // Transform a Google contact entry into json format.
  // The json format is the same used in Contacts api ;P
  var gContactToJson = function gContactToJson(googleContact) {
    var output = {};

    // This field will be needed for indexing within the
    // import process, not for the api
    output.uid = getUid(googleContact);

    output.name = [getValueForNode(googleContact, 'title')];

    // Store the photo url, not in the contact itself
    var photoUrl = googleContact.querySelector('link[type="image/*"]');
    if (photoUrl) {
      photoUrl = photoUrl.getAttribute('href');
    } else {
      // No image link
      photoUrl = '';
    }
    photoUrls[output.uid] = photoUrl;

    var name = googleContact.querySelector('name');
    if (name) {
      var contactName = getValueForNode(name, 'givenName');
      if (contactName) {
        output.givenName = [contactName];
      }
      var contactFamilyName = getValueForNode(name, 'familyName');
      if (contactFamilyName) {
        output.familyName = [contactFamilyName];
      }
      var contactSuffix = getValueForNode(name, 'additionalName');
      if (contactSuffix) {
        output.additionalName = [contactSuffix];
      }
    }

    output.email = parseEmails(googleContact);

    output.adr = parseAddress(googleContact);

    output.tel = parsePhones(googleContact);

    var org = googleContact.querySelector('organization');
    if (org) {
      output.org = [getValueForNode(org, 'orgName')];
      output.jobTitle = [getValueForNode(org, 'orgTitle')];
    }

    var bday = googleContact.querySelector('birthday');
    if (bday) {
      output.bday = new Date(Date.parse(bday.getAttribute('when')));
    }

    var content = googleContact.querySelector('content');
    if (content) {
      output.note = [content.textContent];
    }

    output.category = [CATEGORY];
    output.url = [{
      type: ['source'],
      value: getContactURI(output)
    }];

    return output;
  };

  var getContactURI = function getContactURI(contact) {
    return URN_IDENTIFIER + contact.uid;
  };

  // This will be a full url like:
  // http://www.google.com/m8/feeds/contacts/<email>/base/<contact_id>
  // for a specific contact node
  var getUid = function getUid(contact) {
    return contact.querySelector('id').textContent;
  };

  // Returns an array with the possible emails found in a contact
  // as a ContactField format
  var parseEmails = function parseEmails(googleContact) {
    var DEFAULT_EMAIL_TYPE = 'other';
    var emails = [];
    var fields = googleContact.getElementsByTagNameNS(GD_NAMESPACE,
      'email');
    if (fields && fields.length > 0) {
      for (var i = 0; i < fields.length; i++) {
        var emailField = fields.item(i);

        // Type format: rel="http://schemas.google.com/g/2005#home"
        var type = emailField.getAttribute('rel') || DEFAULT_EMAIL_TYPE;
        if (type.indexOf('#') > -1) {
          type = type.substr(type.indexOf('#') + 1);
        }

        emails.push({
          'type': [type],
          'value': emailField.getAttribute('address')
        });
      }
    }

    return emails;
  };

  // Given a google contact returns an array of ContactAddress
  var parseAddress = function parseAddress(googleContact) {
    var addresses = [];
    var fields = googleContact.getElementsByTagNameNS(GD_NAMESPACE,
      'structuredPostalAddress');
    if (fields && fields.length > 0) {
      for (var i = 0; i < fields.length; i++) {
        var field = fields.item(i);
        var address = {};

        address.streetAddress = getValueForNode(field, 'street');
        address.locality = getValueForNode(field, 'city');
        address.region = getValueForNode(field, 'region');
        address.postalCode = getValueForNode(field, 'postcode');
        address.countryName = getValueForNode(field, 'country');

        addresses.push(address);
      }
    }
    return addresses;
  };

  // Given a google contact this function returns an array of
  // ContactField with the pones stored for that contact
  var parsePhones = function parsePhones(googleContact) {
    var DEFAULT_PHONE_TYPE = 'other';
    var GMAIL_MAP = {
      'work_fax' : 'faxOffice',
      'home_fax' : 'faxHome',
      'pager' : 'other',
      'main' : 'other'
    };
    var phones = [];
    var fields = googleContact.getElementsByTagNameNS(GD_NAMESPACE,
      'phoneNumber');
    if (fields && fields.length > 0) {
      for (var i = 0; i < fields.length; i++) {
        var field = fields.item(i);

        // Type format: rel="http://schemas.google.com/g/2005#home"
        var type = field.getAttribute('rel') || DEFAULT_PHONE_TYPE;
        if (type.indexOf('#') > -1) {
          type = type.substr(type.indexOf('#') + 1);
        }

        phones.push({
          'type': [GMAIL_MAP[type] || type],
          'value': field.textContent
        });
      }
    }

    return phones;
  };

  // Given a contact from the mozcontact api, fetch the Google Contacts
  // identifier
  var getContactUid = function getContactUid(deviceContact) {
    var out = -1;

    var url = deviceContact.url;
    if (Array.isArray(url)) {
      var targetUrls = url.filter(function(aUrl) {
        return Array.isArray(aUrl.type) &&
          aUrl.type.indexOf('source') !== -1 &&
          aUrl.value;
      });

      if (targetUrls[0]) {
        out = resolveURI(targetUrls[0].value);
      }
    }

    return out;
  };

  // From a contact URL, that we expect to be a URI
  // return the google contact id if we find it on
  // the uri, -1 otherwise
  var resolveURI = function resolveURI(uri) {
    if (uri && uri.indexOf(URN_IDENTIFIER) == 0) {
      var output = uri.substr(URN_IDENTIFIER.length);
      if (output && output.length > 0) {
        return output;
      }
    }

    return -1;
  };

  var downloadContactPicture = function downloadContactPicture(googleContact,
    access_token, callbacks) {
    var url = buildContactPhotoURL(googleContact, access_token);
    return Rest.get(url, callbacks, {
      'responseType': 'blob'
    });
  };

  // Build the url of the photo with the access token
  var buildContactPhotoURL = function contactPhotoURL(contact, access_token) {
    if (photoUrls && photoUrls[contact.uid]) {
      return photoUrls[contact.uid] + '?access_token=' + access_token;
    }

    return null;
  };

  var startSync = function startSync() {
    //We don't sync Google contacts (yet)
  };

  var getServiceName = (function getServiceName() {
    return 'gmail';
  })();

  var getAutomaticLogout = (function getAutomaticLogout() {
    return true;
  })();

  return {
    'listAllContacts': listAllContacts,
    'listDeviceContacts': listDeviceContacts,
    'getImporter': getImporter,
    'cleanContacts': cleanContacts,
    'adaptDataForShowing': adaptDataForShowing,
    'adaptDataForSaving': adaptDataForSaving,
    'getContactUid': getContactUid,
    'downloadContactPicture': downloadContactPicture,
    'startSync': startSync,
    'name': getServiceName,
    'automaticLogout': getAutomaticLogout,
    'gContactToJson': gContactToJson
  };

})();
