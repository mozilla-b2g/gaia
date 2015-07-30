'use strict';

/* globals mozContact */

var fs = require('fs');

/* This module contains Contacts Data Layer functions */

function ContactsData(client) {
  this.client = client;
}

ContactsData.prototype = {
  // Creates a new FB Contact
  createFbContact: function() {
    this.client.importScript(fs.readFileSync(__dirname +
                                            '/../data/facebook_contact_data.js',
                                            'utf8'));

    var saveFBContact = function() {
      var LazyLoader =  window.wrappedJSObject.LazyLoader;
      var data = window.wrappedJSObject.data;
      var fb = window.wrappedJSObject.fb;
      var Contacts = window.wrappedJSObject.Contacts;

      var DEPS = [
        '/shared/js/contacts/utilities/image_square.js'
      ];
      Contacts.loadFacebook(function() {
        LazyLoader.load(DEPS, function() {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', '/contacts/style/images/f_logo.png');
          xhr.responseType = 'blob';
          xhr.onload = function() {
            var fbContact = new fb.Contact();
            data.fbContactData.fbInfo.photo = [xhr.response];
            fbContact.setData(data.fbContactData);

            var savingFBContact = fbContact.save();

            savingFBContact.onsuccess = function() {
              marionetteScriptFinished(data.fbContactData);
            };

            savingFBContact.onerror = function() {
              marionetteScriptFinished();
            };
          };
          xhr.onerror = marionetteScriptFinished;
          xhr.send(null);
        });
      });
    };

    var fbContactData;
    this.client.executeAsyncScript(saveFBContact, function(err, val) {
      if (err) {
        console.error(err);
      }

      fbContactData = val;
    });

    this.client.waitFor(function() {
      return fbContactData;
    });

    return fbContactData;
  },

  createMozContact: function(contactData, withPhoto) {
    var saveMozContact = function(contactData, withPhoto) {
      var doSave = function doSave(contactData) {
        var mozContacts = navigator.mozContacts;

        var handler = function handler(event) {
          mozContacts.removeEventListener('contactchange', handler);
          marionetteScriptFinished(event.contactID);
        };

        mozContacts.addEventListener('contactchange', handler);

        var contact = new mozContact(contactData);
        var req = mozContacts.save(contact);

        req.onerror = function() {
          mozContacts.removeEventListener('contactchange', handler);
          marionetteScriptFinished();
        };
      };

      if (withPhoto) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/contacts/style/images/f_logo.png');
        xhr.responseType = 'blob';
        xhr.onload = function() {
          contactData.photo = [xhr.response];
           doSave(contactData);
        };
        xhr.onerror = marionetteScriptFinished;

        xhr.send(null);
      }
      else {
        doSave(contactData);
      }
    };

    var contactID;
    this.client.executeAsyncScript(saveMozContact, [contactData, withPhoto],
      function(err, val) {
        if (err) {
          console.error(err);
        }
        contactID = val;
    });

    this.client.waitFor(function() {
      return contactID;
    });

    return contactID;
  }
};

module.exports = ContactsData;
