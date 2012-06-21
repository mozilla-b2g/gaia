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
      // Populating blocks
      var alphabet = [];
      for(var i = 65; i <= 90; i++) {
        alphabet.push({group: String.fromCharCode(i)});
      }
      owd.templates.append(groupsList, alphabet);
      groupsList.addEventListener('click', pickContact);
    }

    var load = function load() {
      getContactsByGroup(function(contacts) {
        for (var group in contacts) {
          iterateOverGroup(group, contacts[group]);
        }
        lazyload.init('#groups-container', '#groups-container img',
                      function load(images) {
                        var len = images.length;
                        for (var i = 0; i < len; i++) {
                          var image = images[i];
                          var src = image.dataset.src;
                          if (src && src !== 'null') {
                            image.src = src;
                          }
                        }
                      });
      }, function() {
        console.log('ERROR Retrieving contacts');
      });
    };

    var iterateOverGroup = function iterateOverGroup(group, contacts) {
      if (group && group.trim().length > 0 && contacts.length > 0) {
        var olElem = groupsList.querySelector('#contacts-list-' + group);
        if (olElem) {
          if (contacts.length > 0) {
            owd.templates.append(olElem, contacts);
            showGroup(group);
          }
        }
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

    var add = function add(id) {
      getContactById(id, function(contact) {
        var newLi, familyName = contact.familyName[0];
        var group = familyName.charAt(0).toUpperCase();
        var list = groupsList.querySelector('#contacts-list-' + group);
        var liElems = list.getElementsByTagName('li');
        var len = liElems.length;
        for (var i = 1; i < len; i++) {
          var liElem = liElems[i];
          var fName = liElem.querySelector('b').textContent;
          if (fName >= familyName) {
            newLi = owd.templates.render(liElems[0], contact);
            list.insertBefore(newLi, liElem);
            lazyload.reload();
            break;
          }
        }

        if(!newLi) {
          owd.templates.append(list, contact);
          lazyload.reload();
        }

        if (list.children.length === 2) {
          // template + new record
          showGroup(group);
        }
      }, function() {});
    }

    var hideGroup = function hideGroup(group) {
      groupsList.querySelector('#group-' +
                                     group).classList.add('hide');
    }

    var showGroup = function showGroup(group) {
      groupsList.querySelector('#group-' +
                                     group).classList.remove('hide');
    }

    var remove = function remove(id) {
      var item = groupsList.querySelector('li[data-uuid=\"' + id + '\"]');
      if (item) {
        var group = item.querySelector('b').textContent.charAt(0).toUpperCase();
        var ol = item.parentNode;
        ol.removeChild(item);
        if (ol.children.length === 1) {
          // Only template
          hideGroup(group);
        }
        lazyload.reload();
      }
    }

    var reload = function reload(id) {
      remove(id);
      add(id);
    }

    return {
      'init': init,
      'load': load,
      'removeContact': remove,
      'addContact': add,
      'reloadContact': reload,
      'addEventListener': addEventListener
    };

  })(document);
}
