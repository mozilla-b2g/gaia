'use strict';

var accessURI = 'https://www.linkedin.com/uas/oauth2/authorization?response_type=code' +
                '&client_id=773tsorjqd8pqw' +
                '&scope=r_fullprofile%20r_emailaddress%20r_network' +
                '&state=' + (new Date()) +
                '&redirect_uri=http://127.0.0.1/li';

var LinkedIn = function LinkedIn() {

  var accessToken = null;
  var datastore = null;

  var initLogin = function(ds, cb) {
    datastore = ds;
    accessToken = localStorage.accessToken;

    if (accessToken) {
      cb(accessToken);
      return;
    }

    var authWindow = window.open(accessURI);
    window.addEventListener('message', function(evt) {
      authWindow.close();
      var code = evt.data.code;

      exchangeAuthCode(code, cb);
    });
  };

  var getContacts = function getContacts(cb) {
    getLinkedinPeople(cb);
  };

  var importContacts = function importContacts(cb) {
    getContacts(function(contacts) {
      // Save contacts to local ds
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

  function getLinkedinPeople(cb) {
    var url = 'https://api.linkedin.com/v1/people/~/connections?oauth2_access_token=' + accessToken;

    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
    xhr.open('GET', url, true);
    xhr.addEventListener('load', function dataLoaded(e) {
      if (xhr.status === 200 || xhr.status === 0) {
        parseContacts(xhr.responseXML, cb);
      }
    });
    xhr.send();
  }

  function parseContacts(xml, cb) {
    var contactsElements = xml.querySelectorAll('person');
    contactsElements = Array.prototype.slice.call(contactsElements);
    parseIterative(contactsElements, [], cb);
  }

  function parseIterative(unparsedList, parsedList, cb) {
    if (!unparsedList || unparsedList.length === 0) {
      cb(parsedList);
      return;
    }

    var unparsed = unparsedList[0];
    var rest = unparsedList.slice(1);

    parseContact(unparsed, function(contact) {
      parsedList.push(contact);
      parseIterative(rest, parsedList, cb);
    });

  }

  function parseContact(raw, cb) {
    var contact = {};

    contact.uid = raw.querySelector('id').textContent;
    contact.givenName = [];
    contact.givenName[0] = raw.querySelector('first-name') ?
      raw.querySelector('first-name').textContent || '' : '';
    contact.familyName = [];
    contact.familyName[0] = raw.querySelector('last-name') ?
      raw.querySelector('last-name').textContent || '' : '';
    contact.name = [contact.givenName[0] + ' ' + contact.familyName[0]];
    contact.org = [];
    contact.org[0] = raw.querySelector('headline') ?
      raw.querySelector('headline').textContent || '' : '';

    // Parse photo here
    var photoUrl = raw.querySelector('picture-url');
    if (photoUrl) {
      photoUrl = photoUrl.textContent;
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', photoUrl, true);
      xhr.responseType = 'blob';
      xhr.addEventListener('load', function onImageLoaded(e) {
        if (xhr.status === 0 || xhr.status === 200) {
          contact.photo = [xhr.response];
        }
        cb(contact);
      });
      xhr.send();
    } else {
      cb(contact);
    }
  }

  function exchangeAuthCode(code, cb) {
    var url = 'https://www.linkedin.com/uas/oauth2/accessToken?grant_type=authorization_code' +
      '&code=' + code +
      '&redirect_uri=http://127.0.0.1/li' +
      '&client_id=773tsorjqd8pqw' +
      '&client_secret=oX6W3js86FIfNtZH';

    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
    xhr.open('POST', url, true);
    xhr.addEventListener('load', function dataLoaded(e) {
      if (xhr.status === 200 || xhr.status === 0) {
        var response = xhr.response;
        if (typeof response === 'string') {
          response = JSON.parse(response);
        }

        accessToken = response.access_token;
        localStorage.accessToken = accessToken;
        cb(accessToken);
      } else {
        console.error('Could not get an access token from url ' + url);
      }
    });
    xhr.send();

  }

  return {
    initLogin: initLogin,
    getContacts: getContacts,
    importContacts: importContacts
  };

}();
