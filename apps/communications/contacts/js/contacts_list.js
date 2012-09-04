﻿'use strict';

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
      fastScroll = document.querySelector('.view-jumper'),
      scrollable = document.querySelector('#groups-container');

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
    var selector = 'h2.block-title:not(.hide)';
    FixedHeader.init('#groups-container', '#fixed-container', selector);

    initAlphaScroll();
  }

  var initAlphaScroll = function initAlphaScroll() {
    var overlay = document.querySelector('.view-jumper-current');
    var overlayContent = document.querySelector('#current-jumper');
    var jumper = document.querySelector('.view-jumper-inner');

    var params = {
      overlay: overlay,
      overlayContent: overlayContent,
      jumper: jumper,
      groupSelector: '#group-',
      scrollToCb: scrollToCb
    };

    utils.alphaScroll.init(params);
  }

  var scrollToCb = function scrollCb(groupContainer) {
    scrollable.scrollTop = groupContainer.offsetTop;
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
    if (contact.photo && contact.photo.length > 0) {
      Contacts.updatePhoto(contact.photo[0], img);
    }
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

    // Label the contact concerning social networks
    if (contact.category) {
      var marks = buildSocialMarks(contact.category);
      if (marks.length > 0) {
        if (!contact.org || contact.org.length === 0 ||
            contact.org[0].length === 0) {
          marks[0].classList.add('notorg');
        }
        marks.forEach(function(mark) {
          body.appendChild(mark);
        });
      }
    }

    link.appendChild(body);
    contactContainer.appendChild(link);
    return contactContainer;
  }

  function buildSocialMarks(category) {
    var marks = [];
    if (category.indexOf('facebook') !== -1) {
      marks.push(markAsFb(createSocialMark()));
    }

    if (category.indexOf('twitter') !== -1) {
      marks.push(markAsTw(createSocialMark()));
    }

    return marks;
  }

  function createSocialMark() {
    var span = document.createElement('span');
    span.classList.add('icon-social');

    return span;
  }

  function markAsFb(ele) {
    ele.classList.add('icon-fb');

    return ele;
  }

  function markAsTw(ele) {
    ele.classList.add('icon-tw');

    return ele;
  }

  var addImportSimButton = function addImportSimButton() {
    var container = groupsList.parentNode; // #groups-container
    var button = document.createElement('button');
    button.setAttribute('class', 'simContacts action action-add');
    button.textContent = _('simContacts-import');
    container.appendChild(button);

    // TODO: don't show this button if no SIM card is found...

    button.onclick = function readFromSIM() {
      // replace the button with a throbber
      container.removeChild(button);
      var span = document.createElement('span');
      span.textContent = _('simContacts-importing');
      var small = document.createElement('small');
      small.textContent = _('simContacts-reading');
      var throbber = document.createElement('p');
      throbber.className = 'simContacts';
      throbber.appendChild(span);
      throbber.appendChild(small);
      container.appendChild(throbber);

      // import SIM contacts
      importSIMContacts(
          function onread() {
            small.textContent = _('simContacts-storing');
          },
          function onimport() {
            container.removeChild(throbber);
            getContactsByGroup();
          },
          function onerror() {
            container.removeChild(throbber);
            console.log('Error reading SIM contacts.');
          }
      );
    };
  }

  var removeImportSimButton = function removeImportSimButton() {
    var container = groupsList.parentNode; // #groups-container
    var button = container.querySelector('button.simContacts');
    if (button) {
      container.removeChild(button);
    }
  }

  var buildContacts = function buildContacts(contacts, fbContacts) {
    for (var i = 0; i < contacts.length; i++) {
      var contact = contacts[i];

      if (fbContacts && fb.isFbContact(contact)) {
        var fbContact = new fb.Contact(contact);
        contact = fbContact.merge(fbContacts[fbContact.uid]);
      }

      var group = getGroupName(contact);
      var listContainer = document.getElementById('contacts-list-' + group);
      var newContact = renderContact(refillContactData(contact));
      listContainer.appendChild(newContact);
      showGroup(group);
    }

    FixedHeader.refresh();
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

    request.onsuccess = function favoritesCallback() {
      if (request.result.length > 0) {
        showGroup('favorites');
      }
      for (var i = 0; i < request.result.length; i++) {
        var contactToRender = request.result[i];
        if (fb.isFbContact(contactToRender)) {
          var fbContact = new fb.Contact(contactToRender);
          var freq = fbContact.getData();
          freq.onsuccess = function() {
            addToFavoriteList(freq.result);
          }

          freq.onerror = function() {
            addToFavoriteList(contactToRender);
          }
        } else {
                  addToFavoriteList(contactToRender);
        }
      }
    }
  };

  function addToFavoriteList(c) {
    var group = 'contacts-list-favorites';
    var container = document.getElementById(group);

    var newContact = renderContact(c);
    container.appendChild(newContact);
  }

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
        addImportSimButton();
      } else {
        var fbReq = fb.contacts.getAll();
        fbReq.onsuccess = function() {
          buildContacts(request.result, fbReq.result);
        }
        fbReq.onerror = function() {
           buildContacts(request.result);
        }
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

    request.onsuccess = function findCallback(e) {
      var result = e.target.result[0];

      if (fb.isFbContact(result)) {
        // Fb data for the contact has to be obtained
        var fbContact = new fb.Contact(result);
        var fbReq = fbContact.getData();
        fbReq.onsuccess = function() {
          successCb(result, fbReq.result);
        }
        fbReq.onerror = function() {
          successCb(result);
        }
      } else {
            successCb(result);
      }

    }; // request.onsuccess

    if (typeof errorCb === 'function') {
      request.onerror = errorCb;
    }
  }

  /*
    Two contacts are returned because the enrichedContact is readonly
    and if the Contact is edited we need to prevent saving
    FB data on the mozContacts DB.
  */
  var addToList = function addToList(contact, enrichedContact) {
    var newLi;

    var theContact = contact;

    if (enrichedContact) {
      theContact = enrichedContact;
    }

    var group = getGroupName(theContact);

    var list = groupsList.querySelector('#contacts-list-' + group);

    removeImportSimButton();
    addToGroup(theContact, list);

    if (list.children.length === 1) {
      // template + new record
      showGroup(group);
    }

    // If is favorite add as well to the favorite group
    if (theContact.category && theContact.category.indexOf('favorite') != -1) {
      list = document.getElementById('contacts-list-favorites');
      addToGroup(theContact, list);

      if (list.children.length === 1) {
        showGroup('favorites');
      }
    }
    FixedHeader.refresh();
  }

  // Fills the contact data to display if no givenName and familyName
  var refillContactData = function refillContactData(contact) {
    if (!contact.givenName && !contact.familyName) {
      if (contact.tel && contact.tel.length > 0) {
        contact.givenName = contact.tel[0].value;
      } else if (contact.email && contact.email.length > 0) {
        contact.givenName = contact.email[0].value;
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
      contact.tel[0].value : '');
    ret.push(contact.email && contact.email.length > 0 ?
      contact.email[0].value : '');
    ret.push('#');

    return ret.join('');
  }

  var getGroupName = function getGroupName(contact) {
    var ret = getStringToBeOrdered(contact);
    ret = normalizeText(ret.charAt(0).toUpperCase());

    var code = ret.charCodeAt(0);
    if (code < 65 || code > 90) {
      ret = 'und';
    }
    return ret;
  }

  var refresh = function reload(id) {
    if (typeof(id) == 'string') {
      remove(id);
      getContactById(id, addToList);
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
