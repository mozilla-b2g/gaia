'use strict';

var contacts = window.contacts || {};

if (!contacts.List) {

  /*
   * This module implements the list of contacts
   */
  contacts.List = (function(doc) {
    var groupsList;

    var callbacks = [];

    var api = navigator.mozContacts;

    var init = function load(elem) {
      groupsList = doc.getElementById(elem);
      groupsList.addEventListener('click', pickContact);
    }

    var load = function load() {
      getContactsByGroup(function(contacts) {
        for (var group in contacts) {
          iterateOverGroup(group, contacts[group]);
        }
      }, function() {
        console.log('ERROR Retrieving contacts');
      });
    };

    var iterateOverGroup = function iterateOverGroup(group, contacts) {
      if (group && group.trim().length > 0 && contacts.length > 0) {
        var gElem = owd.templates.append(groupsList, {
          group: group
        });

        owd.templates.append(gElem.querySelector('#contacts-list'), contacts);
      }
    };

    var getContactsByGroup = function getContactsByGroup(successCb, errorCb) {
      var options = {
        sortBy: 'familyName',
        sortOrder: 'ascending'
      };

      var request = api.find(options);
      request.onsuccess = function findCallback() {
        var result = {};
        var contacts = request.result;
        for (var i = 0; i < contacts.length; i++) {
          var letter = contacts[i].familyName[0].charAt(0).toUpperCase();
          if (!result.hasOwnProperty(letter)) {
            result[letter] = [];
          }
          result[letter].push(contacts[i]);
        }
        successCb(result);
      };

      request.onerror = errorCb;
    }

    var getContactById = function(contactID, successCb, errorCb) {
      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: contactID
      };

      var request = contacts.api.find(options);
      request.onsuccess = function findCallback() {
        if (request.result.length === 0)
          errorCb();

        successCb(request.result[0]);
       };

       request.onerror = errorCb;
    }

    var addEventListener = function addEventListener(event, callback) {
      if (event === 'click') {
        callbacks.push(callback);
      }
    }

    var pickContact = function pickContact(evt) {
      var dataset = evt.target.dataset;
        if (dataset && 'uuid' in dataset) {
          getContactById(dataset.uuid, function(contact) {
            callbacks.forEach(function(callback) {
              callback(contact);
            });
        }, function() {});
      }
    }

    return {
      'init': init,
      'load': load,
      'addEventListener': addEventListener
    };

  })(document);
}
