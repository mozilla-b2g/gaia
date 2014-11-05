'use strict';

var googleAuth = 'https://accounts.google.com/o/oauth2/auth?scope=' +
 'https://www.google.com/m8/feeds/&response_type=token&redirect_uri=' +
 'http://postmessageitor.eu01.aws.af.cm/&approval_prompt=force&' +
 'client_id=206115911344.apps.googleusercontent.com';

var Google = function Google() {

  var authWindow;
  var accessToken;
  var datastore;

  var initLogin = function initLogin(ds, cb) {
    accessToken = localStorage.accessToken;
    datastore = ds;
    if (accessToken) {
      cb(accessToken);
      return;
    }
    authWindow = window.open(googleAuth);
    window.addEventListener('message', function(evt) {
      authWindow.close();
      accessToken = evt.data.access_token;
      localStorage.accessToken = accessToken;
      if (typeof cb === 'function') {
        cb(accessToken);
      }
    });
  };

  var getContacts = function getContacts(cb) {
    var parser = ContactsParser(accessToken, function() {
      var contacts = parser.getContacts();
      cb(contacts);
    });
    parser.fetchContacts();
  };

  var importContacts = function importContacts(cb) {
    this.getContacts(function(contacts) {
      doImportContacts(contacts, cb);
    });
  };

  function doImportContacts(contacts, cb) {
    if (!contacts || contacts.length === 0) {
      if (typeof cb === 'function') {
        cb();
      }
      return;
    }

    var contact = prepareForDS(contacts[0]);

    function continuee() {
      var rest = contacts.slice(1);
      if (rest && rest.length > -1) {
        doImportContacts(rest, cb);
      }
    }

    datastore.add(contact).then(function(id) {
      console.add('Added contact with id ' + id);
      continuee();

    }, function() {
      console.add('Error saving contact ');
      continuee();
    });
  }

  function prepareForDS(contact) {
    // Initialy dont do any extra processing
    return contact;
  }

  return {
    initLogin: initLogin,
    getContacts: getContacts,
    importContacts: importContacts
  };

}();



var ContactsParser = function contacts(t, cb) {

  var token = t;

  var contacts = [];
  var contactsToImport = [];
  var GOOGLE_URL = 'https://www.google.com/m8/feeds/contacts/default/full?max-results=10000';
  var GROUPS_END_POINT = 'https://www.google.com/m8/feeds/groups/default/full/';
  var GD_NAMESPACE = 'http://schemas.google.com/g/2005';
  var CATEGORY = 'gmail';
  var URN_IDENTIFIER = 'urn:service:gmail:uid:';

  var fetchContacts = function fetchContact() {
    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
    xhr.open('GET', GROUPS_END_POINT, true);
    xhr.setRequestHeader('Authorization', 'OAuth ' + token);
    xhr.setRequestHeader('Gdata-version', '3.0');
    xhr.addEventListener('load', function dataLoaded(e) {
      if (xhr.status == 200 || xhr.status == 0) {
        var feed = xhr.responseXML.getElementsByTagName('feed')[0];
        if (feed === null) {
          getContactsByGroup();
          return;
        }

        var sgc = feed.querySelector('systemGroup[id="Contacts"]');
        if (sgc !== null) {
          var id = sgc.parentNode.querySelector('id').textContent;
          getContactsByGroup(id);
        } else {
          getContactsByGroup();
        }
      } else {
        getContactsByGroup();
      }
    });
    xhr.send(null);
  };

  var getContactsByGroup = function getContactsByGroup(groupId) {
    var url = GOOGLE_URL;
    if (groupId) {
      url += '&group=' + groupId;
    }

    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', 'OAuth ' + token);
    xhr.setRequestHeader('Gdata-version', '3.0');
    xhr.addEventListener('load', function dataLoaded(e) {
      if (xhr.status == 200 || xhr.status == 0) {
        parseContacts(xhr.responseXML);
        cb(contacts);
      } else {
        // TODO : Handle error
        console.error('----->> Pete');
        delete localStorage.accessToken;
      }
    });
    xhr.send(null);
  };

  var parseContacts = function parseContacts(responseXML) {
    contacts = [];
    var contactsEntries = responseXML.querySelectorAll('entry');
    for (var i = 0; i < contactsEntries.length; i++) {
      var entry = contactsEntries[i];
      contacts.push(gContactToJson(entry));
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
    output.photoUrl = photoUrl;

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

  // All contacts
  var getContacts = function getContacts() {
    return contacts;
  };

  var cancelImport = function cancelImport() {

  };

  return {
    'parseContacts': parseContacts,
    'fetchContacts': fetchContacts,
    'getContacts': getContacts,
    'cancelImport': cancelImport
  };
};