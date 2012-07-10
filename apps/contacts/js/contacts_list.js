'use strict';

var contacts = window.contacts || {};

contacts.List = (function() {
  var groupsList;

  var init = function load(element) {
    groupsList = element;
    groupsList.addEventListener('click', onClickHandler);

    // Populating contacts by groups
    var alphabet = [{group: 'favorites', letter: ''}];
    for (var i = 65; i <= 90; i++) {
      var letter = String.fromCharCode(i);
      alphabet.push({group: letter, letter: letter});
    }
    alphabet.push({group: 'und', letter: '#'});

    utils.templates.append(groupsList, alphabet);
  }

  var load = function load(contacts) {

    var onError = function() {
      console.log('ERROR Retrieving contacts');
    }

    getContactsByGroup(onError, contacts);
    getFavorites();
  };

  var iterateOverGroup = function iterateOverGroup(group, contacts) {
    if (contacts.length === 0)
      return;

    var container = groupsList.querySelector('#contacts-list-' + group);
    if (container) {
      utils.templates.append(container, contacts);
      showGroup(group);
    }
  };


  var buildContacts = function buildContacts(contacts) {
    var group = null;

    var count = contacts.length;
    if (count > 0) {
      group = getGroupName(contacts[0]);
    }

    var ret = [];
    for (var i = 0; i < count; i++) {
      var letter = getGroupName(contacts[i]);

      if (letter === group) {
        ret.push(contacts[i]);
        continue;
      }

      iterateOverGroup(group, ret);
      ret = [contacts[i]];
      group = letter;
    }

    if (ret.length > 0) {
      iterateOverGroup(group, ret);
    }
  };

  var buildFavorites = function buildFavorites(favorites) {
    iterateOverGroup('favorites', favorites);
  }

  var getFavorites = function getFavorites() {
    var options = {
      filterBy: ['category'],
      filterOp: 'contains',
      filterValue: ['favorite'],
      sortBy: 'familyName',
      sortOrder: 'ascending'
    };

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function favoritesCallback() {
      //request.result is an object, transform to an array
      var result = [];
      for (var i in request.result) {
        result.push(request.result[i]);
      }
      buildFavorites(result);
    }
  };

  var getContactsByGroup = function gCtByGroup(errorCb, contacts) {
    if (typeof contacts !== 'undefined') {
      buildContacts(contacts, successCb);
      return;
    }

    var options = {
      sortBy: 'familyName',
      sortOrder: 'ascending'
    };

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      buildContacts(request.result);
    };

    request.onerror = errorCb;
  }

  var getContactById = function(contactID, successCb, errorCb) {
    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: contactID
    };

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      successCb(request.result[0]);
    };

    if (errorCb) {
      request.onerror = errorCb;
    }
  }


  var addToList = function addToList(contact) {
    var newLi;
    var group = getGroupName(contact);

    var list = groupsList.querySelector('#contacts-list-' + group);

    addToGroup(contact, list);

    if (list.children.length === 2) {
      // template + new record
      showGroup(group);
    }

    // If is favorite add as well to the favorite group
    if (contact.category && contact.category.indexOf('favorite') != -1) {
      list = groupsList.getDocumentById('contacts-list-favorites');
      addToGroup(contact, list);

      if (list.children.length === 2) {
        showGroup('favorites');
      }
    }
  }

  var addToGroup = function addToGroup(contact, list) {
    var newLi;
    var cName = getStringToBeOrdered(contact);

    var liElems = list.getElementsByTagName('li');
    var len = liElems.length;
    for (var i = 1; i < len; i++) {
      var liElem = liElems[i];
      var familyName = liElem.querySelector('strong > b').textContent.trim();
      var givenName = liElem.querySelector('strong');
      givenName = givenName.childNodes[0].nodeValue.trim();
      var name = getStringToBeOrdered({
        familyName: [familyName],
        givenName: [givenName]
      });
      if (name >= cName) {
        newLi = utils.templates.render(liElems[0], contact);
        list.insertBefore(newLi, liElem);
        break;
      }
    }

    if (!newLi) {
      utils.templates.append(list, contact);
    }

    return list.children.length;
  }

  var hideGroup = function hideGroup(group) {
    groupsList.querySelector('#group-' + group).classList.add('hide');
  }

  var showGroup = function showGroup(group) {
    groupsList.querySelector('#group-' + group).classList.remove('hide');
  }

  var remove = function remove(id) {
    // Could be more than one item if it's in favorites
    var items = groupsList.querySelectorAll('li[data-uuid=\"' + id + '\"]');
    // We have a node list, not an array, and we want to walk it
    Array.prototype.forEach.call(items, function removeItem(item) {
      var ol = item.parentNode;
      ol.removeChild(item);
      if (ol.children.length === 1) {
        // Only template
        hideGroup(ol.dataset.group);
      }
    });
  }

  var getStringToBeOrdered = function getStringToBeOrdered(contact) {
    var ret = [];

    ret.push(contact.familyName ? contact.familyName[0] : '');
    ret.push(contact.givenName ? contact.givenName[0] : '');

    return ret.join('');
  }

  var getGroupName = function getGroupName(contact) {
    var ret = getStringToBeOrdered(contact);

    ret = ret.charAt(0).toUpperCase();
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

  var refresh = function reload(id) {
    if (typeof(id) == 'string') {
      remove(id);
      getContactById(contact, addToList);
    } else {
      var contact = id;
      remove(contact.id);
      addToList(contact);
    }
  }

  var callbacks = [];
  var handleClick = function handleClick(callback) {
    callbacks.push(callback);
  }

  function onClickHandler(evt) {
    var dataset = evt.target.dataset;
    if (dataset && 'uuid' in dataset) {
      callbacks.forEach(function(callback) {
        callback(dataset.uuid);
      });
    }
  }

  return {
    'init': init,
    'load': load,
    'refresh': refresh,
    'getContactById': getContactById,
    'handleClick': handleClick,
    'remove': remove
  };
})();
