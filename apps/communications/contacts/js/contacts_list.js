﻿'use strict';

var contacts = window.contacts || {};
contacts.List = (function() {
  var _,
      groupsList,
      favoriteGroup,
      loaded = false,
      cancel,
      conctactsListView,
      fastScroll,
      scrollable,
      settingsView,
      noContacts,
      imgLoader,
      orderByLastName = null,
      headers = {};

  var init = function load(element) {
    _ = navigator.mozL10n.get;

    cancel = document.getElementById('cancel-search'),
    conctactsListView = document.getElementById('view-contacts-list'),
    fastScroll = document.querySelector('nav[data-type="scrollbar"]'),
    scrollable = document.querySelector('#groups-container');
    settingsView = document.querySelector('#view-settings .view-body-inner');
    noContacts = document.querySelector('#no-contacts');

    groupsList = element;
    groupsList.addEventListener('click', onClickHandler);

    initHeaders();
    favoriteGroup = document.getElementById('group-favorites').parentNode;
    var selector = 'header:not(.hide)';
    FixedHeader.init('#groups-container', '#fixed-container', selector);

    initAlphaScroll();
    imgLoader = new ImageLoader('#groups-container', 'li');

    contacts.Search.init(conctactsListView, favoriteGroup, function(e) {
      onClickHandler(e);
    });
  }

  var initAlphaScroll = function initAlphaScroll() {
    var overlay = document.querySelector('nav[data-type="scrollbar"] p');
    var jumper = document.querySelector('nav[data-type="scrollbar"] ol');

    var params = {
      overlay: overlay,
      jumper: jumper,
      groupSelector: '#group-',
      scrollToCb: scrollToCb
    };

    utils.alphaScroll.init(params);
  }

  var scrollToCb = function scrollCb(domTarget) {
    scrollable.scrollTop = domTarget.offsetTop;
  }

  var load = function load(contacts) {
    var onError = function() {
      console.log('ERROR Retrieving contacts');
    }

    if (loaded) {
      resetDom();
    }

    if (orderByLastName === null) {
      asyncStorage.getItem('order.lastname', (function orderValue(value) {
        orderByLastName = value || false;
        getContactsByGroup(onError, contacts);
      }).bind(this));
    } else {
      getContactsByGroup(onError, contacts);
    }
  };


  var renderGroupHeader = function renderGroupHeader(group, letter) {
    var letteredSection = document.createElement('section');
    var title = document.createElement('header');
    title.id = 'group-' + group;
    title.className = 'hide';
    title.innerHTML = '<abbr title="Contacts listed ' + group + '">';
    title.innerHTML += letter + '</abbr>';
    var contactsContainer = document.createElement('ol');
    contactsContainer.id = 'contacts-list-' + group;
    contactsContainer.dataset.group = group;
    letteredSection.appendChild(title);
    letteredSection.appendChild(contactsContainer);
    groupsList.appendChild(letteredSection);

    headers[group] = contactsContainer;
  }

  var renderContact = function renderContact(contact, fbContacts) {
    if (fbContacts && fb.isFbContact(contact)) {
      var fbContact = new fb.Contact(contact);
      contact = fbContact.merge(fbContacts[fbContact.uid]);
    }
    var orderedString = getStringToBeOrdered(contact);
    contact = refillContactData(contact);
    contact.givenName = contact.givenName || '';
    contact.familyName = contact.familyName || '';
    contact.org = contact.org || '';
    var contactContainer = document.createElement('li');
    contactContainer.className = 'contact-item';
    contactContainer.dataset.uuid = utils.text.escapeHTML(contact.id, true);
    var timestampDate = contact.updated || contact.published || new Date();
    contactContainer.dataset.updated = timestampDate.getTime();
    var link = document.createElement('a');
    link.href = '#';

    //Render photo if there is one
    if (contact.photo && contact.photo.length > 0) {
      var figure = document.createElement('aside');
      figure.className = 'pack-end';
      var img = document.createElement('img');
      try {
        img.dataset.src = window.URL.createObjectURL(contact.photo[0]);
      } catch(err) {
        img.dataset.src = '';
      }
      figure.appendChild(img);
      link.appendChild(figure);
    }

    //Add name and search keywords
    var name = document.createElement('p');
    name.innerHTML = getHighlightedName(contact);
    if (contact.id == 4) {
    }
    name.dataset['search'] = getSearchString(contact);
    name.dataset['order'] = orderedString;

    // Label the contact concerning social networks
    var meta = document.createElement('p');
    if (contact.category) {
      var marks = buildSocialMarks(contact.category);
      if (marks.length > 0) {
        if (!contact.org || contact.org.length === 0 ||
          contact.org[0].length === 0) {
          marks[0].classList.add('notorg');
        }
        marks.forEach(function(mark) {
          meta.appendChild(mark);
        });
      }
    }
    // Add organization name
    if (contact.org && contact.org.length > 0 && contact.org[0] !== '' &&
        contact.org[0] != contact.givenName) {
      meta.innerHTML += utils.text.escapeHTML(contact.org[0], true);
    }

    //Final item structure
    link.appendChild(name);
    link.appendChild(meta);
    contactContainer.appendChild(link);

    return contactContainer;
  }

  var getSearchString = function getSearchString(contact) {
    var searchInfo = [];
    var searchable = ['givenName', 'familyName', 'org'];
    searchable.forEach(function(field) {
      if (contact[field] && contact[field][0]) {
        var value = contact[field][0].trim();
        if (value.length > 0) {
          searchInfo.push(value);
        }
      }
    });
    var escapedValue = utils.text.escapeHTML(searchInfo.join(' '), true);
    return utils.text.normalize(escapedValue);
  }

  var getHighlightedName = function getHighlightedName(contact) {
    var givenName = utils.text.escapeHTML(contact.givenName);
    var familyName = utils.text.escapeHTML(contact.familyName);
    if (orderByLastName) {
      return givenName + ' <strong>' + familyName + '</strong>';
    } else {
      return '<strong>' + givenName + '</strong> ' + familyName;
    }
  };

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

  var buildContacts = function buildContacts(contacts, fbContacts) {
    var counter = {};
    var favorites = [];
    var length = contacts.length;
    var CHUNK_SIZE = 20;

    counter['favorites'] = 0;
    var showNoContacs = length === 0;
    toggleNoContactsScreen(showNoContacs);

    //Adds each contact to its group container
    function appendToList(contact, renderedContact) {
      var group = getGroupName(contact);

      var list = headers[group];
      list.appendChild(renderedContact);

      if (list.children.length === 1) {
        // template + new record
        showGroup(group);
      }
    }

    var numberOfChunks = Math.floor(length / CHUNK_SIZE);
    function renderChunks(index) {
      if (numberOfChunks === index) {
        // Last round. Rendering remaining
        var remaining = length % CHUNK_SIZE;        
        if (remaining > 0) {
          for (var i = 0; i < remaining; i++) {
            var current = (numberOfChunks * CHUNK_SIZE) + i;
            var contact = contacts[current];
            var renderedContact = renderContact(contact, fbContacts);
            appendToList(contact, renderedContact);
            if (contact.category && contact.category.indexOf('favorite') != -1) {
              favorites.push(renderedContact.cloneNode(true));
            }
          }

        }
        renderFavorites(favorites);
        FixedHeader.refresh();
        imgLoader.reload();
        loaded = true;
        return;
      }

      for (var i = 0; i < CHUNK_SIZE; i++) {
        var current = (index * CHUNK_SIZE) + i;
        var contact = contacts[current];
        var renderedContact = renderContact(contact, fbContacts);
        appendToList(contact, renderedContact);
        if (contact.category && contact.category.indexOf('favorite') != -1) {
          favorites.push(renderedContact.cloneNode(true));
        }
      }

      window.setTimeout(function() {
        imgLoader.reload();
        renderChunks(index + 1);
      }, 0);
    }

    renderChunks(0);
  };

  var toggleNoContactsScreen = function cl_toggleNoContacs(show) {
    if (show && !ActivityHandler.currentlyHandling) {
      noContacts.classList.remove('hide');
      return;
    }
    noContacts.classList.add('hide');
  };

  var renderFavorites = function renderFavorites(favorites) {
    if (favorites.length == 0) {
      hideGroup('favorites');
      return;
    }
    for (var i = 0; i < favorites.length; i++) {
      var contactToRender = favorites[i];
      addToFavoriteList(contactToRender);
    }
    showGroup('favorites');
  };

  function addToFavoriteList(c) {
    var group = 'contacts-list-favorites';
    var container = document.getElementById(group);
    container.appendChild(c);
    imgLoader.reload();
  }

  var getContactsByGroup = function gCtByGroup(errorCb, contacts) {
    if (contacts) {
      getContactsWithFb(contacts);
      return;
    }
    getAllContacts(errorCb, getContactsWithFb);
  };

  var getContactsWithFb = function cl_gContactsFb(contacts) {
    if (!fb || !fb.contacts)
      return buildContacts(contacts);

    var fbReq = fb.contacts.getAll();
    fbReq.onsuccess = function() {
      buildContacts(contacts, fbReq.result);
    }
    fbReq.onerror = function() {
      buildContacts(contacts);
    }
  };


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
  };

  var getAllContacts = function cl_getAllContacts(errorCb, successCb) {
    var sortBy = orderByLastName ? 'familyName' : 'givenName';
    var options = {
      sortBy: sortBy,
      sortOrder: 'ascending'
    };

    // We use an empty string here for now because the WebContacts API
    // is really performing a "startswith" instead of "contains".
    // We should look at implementing a "nonempty" filter in the future.
    if (ActivityHandler && ActivityHandler.activtyDataType &&
      ActivityHandler.activityDataType === 'webcontacts/email') {
      options.filterBy = ['email'];
      options.filterOp = 'contains';
      options.filterValue = '';
    }

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      successCb(request.result);
    };

    request.onerror = errorCb;
  };

  /*
    Two contacts are returned because the enrichedContact is readonly
    and if the Contact is edited we need to prevent saving
    FB data on the mozContacts DB.
  */
  var addToList = function addToList(contact, enrichedContact) {

    var theContact = contact;

    if (enrichedContact) {
      theContact = enrichedContact;
    }

    var group = getGroupName(theContact);

    var list = document.getElementById('contacts-list-' + group);

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
    toggleNoContactsScreen(false);
    FixedHeader.refresh();
    imgLoader.reload();
  }

  // Fills the contact data to display if no givenName and familyName
  var refillContactData = function refillContactData(contact) {
    if (!contact.givenName && !contact.familyName) {
      contact.givenName = [];
      if (contact.org && contact.org.length > 0) {
        contact.givenName.push(contact.org);
      } else if (contact.tel && contact.tel.length > 0) {
        contact.givenName.push(contact.tel[0].value);
      } else if (contact.email && contact.email.length > 0) {
        contact.givenName.push(contact.email[0].value);
      } else {
        contact.givenName.push(_('noName'));
      }
    }

    return contact;
  }

  var addToGroup = function addToGroup(contact, list) {
    var newLi;
    var cName = getStringToBeOrdered(contact);

    var liElems = list.getElementsByTagName('li');
    var len = liElems.length;
    for (var i = 0; i < len; i++) {
      var liElem = liElems[i];
      var name = liElem.querySelector('p').dataset.order;
      if (name.localeCompare(cName) >= 0) {
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
    FixedHeader.refresh();
  }

  var showGroup = function showGroup(group) {
    groupsList.querySelector('#group-' + group).classList.remove('hide');
    FixedHeader.refresh();
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
    var selector = 'section header:not(.hide)';
    var visibleElements = groupsList.querySelectorAll(selector);
    var showNoContacts = visibleElements.length === 0;
    toggleNoContactsScreen(showNoContacts);
  }

  var getStringToBeOrdered = function getStringToBeOrdered(contact) {
    var ret = [];

    var familyName, givenName;

    familyName = contact.familyName && contact.familyName.length > 0 ?
      contact.familyName[0] : '';
    givenName = contact.givenName && contact.givenName.length > 0 ?
      contact.givenName[0] : '';

    var first = givenName, second = familyName;
    if (orderByLastName) {
      first = familyName;
      second = givenName;
    }

    ret.push(first);
    ret.push(second);
    ret.push(contact.org);
    ret.push(contact.tel && contact.tel.length > 0 ?
      contact.tel[0].value : '');
    ret.push(contact.email && contact.email.length > 0 ?
      contact.email[0].value : '');
    ret.push('#');

    return utils.text.normalize(ret.join('')).trim();
  }

  var getGroupName = function getGroupName(contact) {
    var ret = getStringToBeOrdered(contact);
    ret = utils.text.normalize(ret.charAt(0).toUpperCase());

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

  var clearClickHandlers = function clearClickHandlers() {
    callbacks = [];
  }

  function onClickHandler(evt) {
    var target = evt.target;
    var dataset = target.dataset || {};
    var parentDataset = target.parentNode ?
                          (target.parentNode.dataset || {}) : {};
    var uuid = dataset.uuid || parentDataset.uuid;
    if (uuid) {
      callbacks.forEach(function(callback) {
        callback(uuid);
      });
    }
    evt.preventDefault();
  }

  // Reset the content of the list to 0
  var resetDom = function resetDom() {
    groupsList.innerHTML = '';
    loaded = false;

    initHeaders();
  };

  // Initialize group headers at the beginning or after a dom reset
  var initHeaders = function initHeaders() {
    // Populating contacts by groups
    headers = {};
    renderGroupHeader('favorites', '');
    for (var i = 65; i <= 90; i++) {
      var letter = String.fromCharCode(i);
      renderGroupHeader(letter, letter);
    }
    renderGroupHeader('und', '#');
  }

  var setOrderByLastName = function setOrderByLastName(value) {
    orderByLastName = value;
    this.load();
  };

  return {
    'init': init,
    'load': load,
    'refresh': refresh,
    'getContactById': getContactById,
    'getAllContacts': getAllContacts,
    'handleClick': handleClick,
    'remove': remove,
    'loaded': loaded,
    'clearClickHandlers': clearClickHandlers,
    'setOrderByLastName': setOrderByLastName
  };
})();
