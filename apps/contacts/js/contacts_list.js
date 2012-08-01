'use strict';

var contacts = window.contacts || {};

contacts.List = (function() {
  var groupsList,
      favoriteGroup,
      inSearchMode = false,
      loaded = false,
      cancel = document.getElementById('cancel-search'),
      conctactsListView = document.getElementById('view-contacts-list'),
      searchBox = document.getElementById('search-contact'),
      searchNoResult = document.getElementById('no-result'),
      fastScroll = document.querySelector('.view-jumper');

  var init = function load(element) {
    groupsList = element;
    groupsList.addEventListener('click', onClickHandler);

    // Populating contacts by groups
    renderGroupHeader('favorites', '');
    for (var i = 65; i <= 90; i++) {
      var letter = String.fromCharCode(i);
      renderGroupHeader(letter, letter);
    }
    renderGroupHeader('und', '#');
    favoriteGroup = document.getElementById('group-favorites').parentNode;
  }

  var load = function load(contacts) {

    var onError = function() {
      console.log('ERROR Retrieving contacts');
    }

    getContactsByGroup(onError, contacts);
    getFavorites();
    this.loaded = true;
  };

  var renderGroupHeader = function renderGroupHeader(group, letter) {
    var li = document.createElement('li');
    var title = document.createElement('h2');
    title.id = 'group-' + group;
    title.className = 'block-title hide';
    title.innerHTML = '<abbr title="Contacts listed ' + group + '">';
    title.innerHTML += letter + '</abbr>';
    var contactsContainer = document.createElement('ol');
    contactsContainer.id = 'contacts-list-' + group;
    contactsContainer.dataset.group = group;
    li.appendChild(title);
    li.appendChild(contactsContainer);
    groupsList.appendChild(li);
  }

  var renderContact = function renderContact(contact) {
    contact.givenName = contact.givenName || '';
    contact.familyName = contact.familyName || '';
    contact.org = contact.org || '';
    var contactContainer = document.createElement('li');
    contactContainer.className = 'block-item';
    contactContainer.dataset.uuid = contact.id;
    var link = document.createElement('a');
    link.href = '#';
    link.className = 'item';
    var figure = document.createElement('figure');
    figure.className = 'item-media pull-right block-media';
    var img = document.createElement('img');
    img.style.backgroundImage = 'url(' + contact.photo + ')';
    figure.appendChild(img);
    link.appendChild(figure);
    var body = document.createElement('p');
    body.className = 'item-body';
    var name = document.createElement('strong');
    name.className = 'block-name';
    name.innerHTML = contact.givenName;
    name.innerHTML += ' <b>' + contact.familyName + '</b>';
    var searchInfo = [];
    var searchable = ['givenName', 'familyName', 'org'];
    searchable.forEach(function(field) {
      if (contact[field] && contact[field][0]) {
        searchInfo.push(contact[field][0]);
      }
    });
    body.dataset['search'] = normalizeText(searchInfo.join(' '));
    body.appendChild(name);
    var small = document.createElement('small');
    small.className = 'block-company';
    small.textContent = contact.org;
    body.appendChild(small);
    link.appendChild(body);
    contactContainer.appendChild(link);
    return contactContainer;
  }

  var getSimContacts = function getSimContacts() {
    var button = document.createElement('button');
    var li = document.createElement('li');
    li.appendChild(button);
    groupsList.appendChild(li);

    button.textContent = 'Import SIM Contacts';
    button.onclick = function readFromSIM() {
      groupsList.removeChild(li);

      var type = 'ADN'; // valid values: 'ADN', 'FDN'
      var request = navigator.mozContacts.getSimContacts(type);
      var throbber = document.createElement('li');
      throbber.textContent = 'Importing SIM contacts (' + type + ')...';
      groupsList.appendChild(throbber);

      request.onsuccess = function onsuccess() {
        groupsList.removeChild(throbber);
        var simContacts = request.result;
        for (var i = 0; i < simContacts.length; i++) {
          //var name = simContacts[i].familyName || simContacts[i].name;
          var name = simContacts[i].name;
          var number = simContacts[i].tel.toString();
          var contact = new mozContact();
          contact.init({
            'id': [name],
            'name': [name],
            'familyName': [name],
            'additionalName': [''],
            'tel': [{ 'number': number, 'type': 'personal' }],
            'note': [simContacts[i].note]
          });
          var req = navigator.mozContacts.save(contact);
          //req.onsuccess = function() { console.log('  ' + contact.id); }
          //req.onerror = function() {
          //console.log('  ' + contact.id + ' - error'); }
        }
        getContactsByGroup();
      };

      request.onerror = function onerror() {
        groupsList.removeChild(throbber);
        console.log('Error reading SIM contacts');
      };
    };
  }

  var buildContacts = function buildContacts(contacts) {
    for (var i = 0; i < contacts.length; i++) {
      var group = getGroupName(contacts[i]);
      var listContainer = document.getElementById('contacts-list-' + group);
      var newContact = renderContact(refillContactData(contacts[i]));
      listContainer.appendChild(newContact);
      showGroup(group);
    }
  };

  var getFavorites = function getFavorites() {
    var options = {
      filterBy: ['category'],
      filterOp: 'contains',
      filterValue: ['favorite'],
      sortBy: 'familyName',
      sortOrder: 'ascending'
    };

    var request = navigator.mozContacts.find(options);
    var group = 'contacts-list-favorites';
    var container = document.getElementById(group);
    request.onsuccess = function favoritesCallback() {
      //request.result is an object, transform to an array
      if (request.result.length > 0)
          showGroup('favorites');
      for (var i in request.result) {
        var newContact = renderContact(request.result[i]);
        container.appendChild(newContact);
      }
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
      if (request.result.length === 0) {
        getSimContacts();
      } else {
        buildContacts(request.result);
      }
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

    if (list.children.length === 1) {
      // template + new record
      showGroup(group);
    }

    // If is favorite add as well to the favorite group
    if (contact.category && contact.category.indexOf('favorite') != -1) {
      list = document.getElementById('contacts-list-favorites');
      addToGroup(contact, list);

      if (list.children.length === 1) {
        showGroup('favorites');
      }
    }
  }

  // Fills the contact data to display if no givenName and familyName
  var refillContactData = function refillContactData(contact) {
    if (!contact.givenName && !contact.familyName) {
      if (contact.tel && contact.tel.length > 0) {
        contact.givenName = contact.tel[0].number;
      } else if (contact.email && contact.email.length > 0) {
        contact.givenName = contact.email[0].address;
      } else {
        contact.givenName = _('noName');
      }
    }

    return contact;
  }

  var addToGroup = function addToGroup(contact, list) {
    var newLi;
    var cName = getStringToBeOrdered(contact);

    refillContactData(contact);

    var liElems = list.getElementsByTagName('li');
    var len = liElems.length;
    for (var i = 0; i < len; i++) {
      var liElem = liElems[i];
      var familyName = liElem.querySelector('strong > b').textContent.trim();
      var givenName = liElem.querySelector('strong');
      givenName = givenName.childNodes[0].nodeValue.trim();
      var name = getStringToBeOrdered({
        familyName: [familyName],
        givenName: [givenName]
      });
      if (name >= cName) {
        newLi = renderContact(contact);
        list.insertBefore(newLi, liElem);
        break;
      }
    }

    if (!newLi) {
      newLi = renderContact(contact);
      list.appendChild(newLi);
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
      if (ol.children.length === 0) {
        // Only template
        hideGroup(ol.dataset.group);
      }
    });
  }

  var getStringToBeOrdered = function getStringToBeOrdered(contact) {
    var ret = [];

    ret.push(contact.familyName && contact.familyName.length > 0 ?
      contact.familyName[0] : '');
    ret.push(contact.givenName && contact.givenName.length > 0 ?
      contact.givenName[0] : '');
    ret.push(contact.tel && contact.tel.length > 0 ?
      contact.tel[0].number : '');
    ret.push(contact.email && contact.email.length > 0 ?
      contact.email[0].address : '');
    ret.push('#');

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

  // Toggle function to show/hide the letters header
  var toggleGroupHeaders = function showHeaders() {
    var headers = document.querySelectorAll('.block-title:not(.hide)');
    if (!headers) {
      return;
    }

    for (var i = 0; i < headers.length; i++) {
      headers[i].classList.toggle('search-hide');
    }
  }

  var exitSearchMode = function exitSearchMode() {
    cancel.classList.add('hide');
    searchNoResult.classList.add('hide');
    conctactsListView.classList.remove('searching');
    searchBox.value = '';
    inSearchMode = false;
    // Show elements that were hidden for the search
    fastScroll.classList.remove('hide');
    groupsList.classList.remove('hide');
    if (favoriteGroup) {
      favoriteGroup.classList.remove('hide');
    }
    toggleGroupHeaders();

    // Bring back to visibilitiy the contacts
    var allContacts = getContactsDom();
    for (var i = 0; i < allContacts.length; i++) {
      var contact = allContacts[i];
      contact.classList.remove('search');
      contact.classList.remove('hide');
    }
    return false;
  };

  var enterSearchMode = function searchMode() {
    if (!inSearchMode) {
      cancel.classList.remove('hide');
      conctactsListView.classList.add('searching');
      cleanContactsList();
      inSearchMode = true;
    }
    return false;
  };

  var search = function performSearch() {

    var pattern = new RegExp(normalizeText(searchBox.value), 'i');
    var count = 0;

    var allContacts = getContactsDom();
    for (var i = 0; i < allContacts.length; i++) {
      var contact = allContacts[i];
      contact.classList.add('search');
      var text = contact.querySelector('.item-body').dataset['search'];
      if (!pattern.test(text)) {
        contact.classList.add('hide');
      } else {
        contact.classList.remove('hide');
        count++;
      }
    }

    if (count == 0) {
      searchNoResult.classList.remove('hide');
    } else {
      searchNoResult.classList.add('hide');
    }
  };

  var cleanContactsList = function cleanContactsList() {
    fastScroll.classList.add('hide');
    if (favoriteGroup) {
      favoriteGroup.classList.add('hide');
    }
    toggleGroupHeaders();
  };

  var getContactsDom = function contactsDom() {
    var selector = ".block-item:not([data-uuid='#id#']";
    return document.querySelectorAll(selector);
  }

  // When the cancel button inside the input is clicked
  document.addEventListener('cancelInput', function() {
    search();
  });

  return {
    'init': init,
    'load': load,
    'refresh': refresh,
    'getContactById': getContactById,
    'handleClick': handleClick,
    'remove': remove,
    'search': search,
    'enterSearchMode': enterSearchMode,
    'exitSearchMode': exitSearchMode,
    'loaded': loaded
  };
})();
