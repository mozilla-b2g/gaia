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
  var EXTRA_HEADERS = {
    'GData-Version': '3.0'
  };
  var GD_NAMESPACE = 'http://schemas.google.com/g/2005';

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

    contacts.sort(function sortGoogleContacts(a, b) {
      var out = 0;
      if (a.familyName && b.familyName &&
        a.familyName.length > 0 && b.familyName.length > 0) {
        out = a.familyName[0].localeCompare(b.familyName[0]);
      } else if (b.familyName && b.familyName.length > 0) {
        out = 1;
      } else if (a.familyName && a.familyName.length > 0) {
        out = -1;
      }

      return out;
    });

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
    var listingCallbacks = {
      success: function onSuccess(response) {
        callbacks.success({
          'data': nodeListToArray(response)
        });
      },
      error: callbacks.error,
      timeout: callbacks.timeout
    };

    return Rest.get(END_POINT, listingCallbacks,
      {'requestHeaders': buildRequestHeaders(access_token),
       'responseType': 'xml'});
  };

  var listDeviceContacts = function listDeviceContacts(callbacks) {
    callbacks.success([]);
  };

  var getImporter = function getImporter(contactsList, access_token) {
    return new window.ContactsImporter(contactsList, access_token, this);
  };

  var getCleaner = function getCleaner(contactsList, access_token) {
    return null;
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

    if (contact.givenName) {
      output.givenName = contact.givenName;
    }

    if (contact.familyName) {
      output.familyName = contact.familyName;
    }

    if (contact.email && contact.email.length > 0) {
      output.email1 = contact.email[0].value;
    }

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

    output.name = getValueForNode(googleContact, 'title');

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
      output.bday = new Date(bday.getAttribute('when'));
    }

    var content = googleContact.querySelector('content');
    if (content) {
      output.note = [content.textContent];
    }

    return output;
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
    var DEFAULT_EMAIL_TYPE = 'personal';
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
          'type': type,
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
    var DEFAULT_PHONE_TYPE = 'personal';
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
          'type': type,
          'value': field.textContent
        });
      }
    }

    return phones;
  };

  var getContactUid = function getContactUid(deviceContact) {
    return '-1';
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

  return {
    'listAllContacts': listAllContacts,
    'listDeviceContacts': listDeviceContacts,
    'getImporter': getImporter,
    'getCleaner': getCleaner,
    'adaptDataForShowing': adaptDataForShowing,
    'adaptDataForSaving': adaptDataForSaving,
    'getContactUid': getContactUid,
    'downloadContactPicture': downloadContactPicture,
    'startSync': startSync,
    'name': getServiceName,
    'gContactToJson': gContactToJson
  };

})();
