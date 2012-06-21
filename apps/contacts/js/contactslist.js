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
      for (var i = 65; i <= 90; i++) {
        var letter = String.fromCharCode(i);
        alphabet.push({group: letter, letter: letter});
      }
      alphabet.push({group: 'und', letter: '#'});
      owd.templates.append(groupsList, alphabet);
      groupsList.addEventListener('click', pickContact);
    }

    var load = function load() {
      getContactsByGroup(function() {
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
      if (contacts.length > 0) {
        var olElem = groupsList.querySelector('#contacts-list-' + group);
        if (olElem) {
          owd.templates.append(olElem, contacts);
          showGroup(group);
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
        var contacts = request.result;
        var len = contacts.length;
        var ret = [], group;
        if (len > 0) {
          group = getGroupName(contacts[0].givenName[0]);
        }

        for (var i = 0; i < len; i++) {
          var letter = getGroupName(contacts[i].givenName[0]);

          if (letter !== group) {
            iterateOverGroup(group, ret);
            ret = [contacts[i]];
          } else {
            ret.push(contacts[i]);
          }

          group = letter;
        }

        if (ret.length > 0) {
          iterateOverGroup(group, ret);
        }

        successCb();
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
        var newLi, givenName = contact.givenName[0];
        var group = getGroupName(givenName);
        var list = groupsList.querySelector('#contacts-list-' + group);
        var liElems = list.getElementsByTagName('li');
        var len = liElems.length;
        for (var i = 1; i < len; i++) {
          var liElem = liElems[i];
          var gName = liElem.querySelector('strong').textContent;
          if (gName >= givenName) {
            newLi = owd.templates.render(liElems[0], contact);
            list.insertBefore(newLi, liElem);
            lazyload.reload();
            break;
          }
        }

        if (!newLi) {
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
        var group = getGroupName(item.querySelector('b').textContent);
        var ol = item.parentNode;
        ol.removeChild(item);
        if (ol.children.length === 1) {
          // Only template
          hideGroup(group);
        }
        lazyload.reload();
      }
    }

    var getGroupName = function getGroupName(txt) {
      var ret = txt.charAt(0).toUpperCase();

      ret = ret.replace(/[ÁÀ]/ig, 'A');
      ret = ret.replace(/[ÉÈ]/ig, 'E');
      ret = ret.replace(/[ÍÌ]/ig, 'I');
      ret = ret.replace(/[ÓÒ]/ig, 'O');
      ret = ret.replace(/[ÚÙ]/ig, 'U');

      var code = ret.charCodeAt(0);
      if (code < 65 || code > 90) {
        ret = 'und';
      }

      return ret;
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
