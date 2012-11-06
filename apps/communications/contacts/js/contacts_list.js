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
      orderByLastName = null;

  var init = function load(element, overlay) {
    _ = navigator.mozL10n.get;

    cancel = document.getElementById('cancel-search'),
    conctactsListView = document.getElementById('view-contacts-list'),
    fastScroll = document.querySelector('.view-jumper'),
    scrollable = document.querySelector('#groups-container');
    settingsView = document.querySelector('#view-settings .view-body-inner');
    noContacts = document.querySelector('#no-contacts');


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
    contacts.Search.init(conctactsListView, favoriteGroup);
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

  var scrollToCb = function scrollCb(domTarget) {
    scrollable.scrollTop = domTarget.offsetTop;
  }

  var load = function load(contacts, overlay) {
    if (overlay) {
      Contacts.showOverlay();
    }
    var onError = function() {
      console.log('ERROR Retrieving contacts');
    }

    if (orderByLastName === null) {
      asyncStorage.getItem('order.lastname', (function orderValue(value) {
        orderByLastName = value || false;
        getContactsByGroup(onError, contacts);
        this.loaded = true;
      }).bind(this));
    } else {
      getContactsByGroup(onError, contacts);
      this.loaded = true;
    }
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
    var timestampDate = contact.updated || contact.published || new Date();
    contactContainer.dataset.updated = timestampDate.getTime();
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
    body.className = 'item-body-exp';
    var name = document.createElement('strong');
    name.className = 'block-name';
    name.innerHTML = getHighlightedName(contact);
    var searchInfo = [];
    var searchable = ['givenName', 'familyName', 'org'];
    searchable.forEach(function(field) {
      if (contact[field] && contact[field][0]) {
        searchInfo.push(contact[field][0]);
      }
    });
    body.dataset['search'] = normalizeText(searchInfo.join(' '));
    body.appendChild(name);

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

    var small = document.createElement('small');
    small.className = 'block-company';
    small.textContent = contact.org;
    body.appendChild(small);

    link.appendChild(body);
    contactContainer.appendChild(link);
    return contactContainer;
  }

  var getHighlightedName = function getHighlightedName(contact) {
    if (orderByLastName) {
      return contact.givenName + ' <b>' + contact.familyName + '</b>';
    } else {
      return '<b>' + contact.givenName + '</b> ' + contact.familyName;
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
    counter['favorites'] = 0;
    var showNoContacs = contacts.length === 0;
    toggleNoContactsScreen(showNoContacs);
    for (var i = 0; i < contacts.length; i++) {
      var contact = contacts[i];

      if (fbContacts && fb.isFbContact(contact)) {
        var fbContact = new fb.Contact(contact);
        contact = fbContact.merge(fbContacts[fbContact.uid]);
      }

      contact.updated = contacts[i].updated || contacts[i].published ||
                                                                    new Date();
      var group = getGroupName(contact);
      counter[group] = counter.hasOwnProperty(group) ? counter[group] + 1 : 0;
      var listContainer = document.getElementById('contacts-list-' + group);
      var newContact = renderContact(refillContactData(contact));
      var contactSelector = '[data-uuid="' + contact.id + '"]';
      var alreadyRendered = listContainer.querySelector(contactSelector);
      var index = counter[group];
      var nodes = listContainer.children;
      var length = nodes.length;
      if (alreadyRendered) {
        // If already rendered, don't do anything unless one has been removed
        // We check that comparing contact.id
        var currentNode = nodes[index];
        var itemBody = currentNode.querySelector('[data-search]');
        var searchable = itemBody.dataset['search'];
        var newItemBody = newContact.querySelector('[data-search]');
        var newSearchable = newItemBody.dataset['search'];
        var hasChanged = searchable != newSearchable ||
                  contact.updated.getTime() > alreadyRendered.dataset.updated;
        if (currentNode.dataset['uuid'] != contact.id || hasChanged) {
          resetGroup(listContainer, counter[group]);
          listContainer.appendChild(newContact);
        }
      } else {
        // If the contact is not already there means is a new one or
        // the letter is empty. If the new one is not at the end of the list
        // we need to remove the following contacts
        if (length > 0 && length >= index + 1) {
          resetGroup(listContainer, counter[group]);
        }
        listContainer.appendChild(newContact);
      }
      showGroup(group);
      if (contact.category && contact.category.indexOf('favorite') != -1) {
        counter['favorites']++;
        favorites.push(contact);
      }
    }
    renderFavorites(favorites);
    cleanLastElements(counter);
    Contacts.hideOverlay();
    FixedHeader.refresh();
  };

  var toggleNoContactsScreen = function cl_toggleNoContacs(show) {
    if (show && !ActivityHandler.currentlyHandling) {
      noContacts.classList.remove('hide');
      return;
    }
    noContacts.classList.add('hide');
  };

  var cleanLastElements = function cleanLastElements(counter) {
    // If reloading contacts, some have been removed and were
    // in the last positions of the letter, the algorithm can't
    // notice it. We need to check the difference at the end to
    // remove the remaining.
    var selectorString = 'ol[data-group]:not(#contacts-list-favorites)';
    var nodes = groupsList.querySelectorAll(selectorString);
    for (var i = 0; i < nodes.length; i++) {
      var currentGroup = nodes[i];
      var group = currentGroup.dataset['group'];
      var currentCount = counter.hasOwnProperty(group) ? counter[group] + 1 : 0;
      if (currentGroup.children.length != currentCount) {
        resetGroup(currentGroup, currentCount);
      }
      currentCount > 0 ? showGroup(group) : hideGroup(group);
    }
  }

  var resetGroup = function resetGroup(container, start) {
    // Method that removes all the contacts in a letter, starting
    // from the 'start' param
    var i = start || 0;
    var length = container.children.length;
    while (length > i) {
      var current = container.children[i];
      container.removeChild(current);
      length = container.children.length;
    }
  };

  var renderFavorites = function renderFavorites(favorites) {
    var group = 'contacts-list-favorites';
    var container = document.getElementById(group);
    container.innerHTML = '';
    if (favorites.length == 0) {
      hideGroup('favorites');
      return;
    }
    for (var i = 0; i < favorites.length; i++) {
      var contactToRender = favorites[i];
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
    showGroup('favorites');
  };

  function addToFavoriteList(c) {
    var group = 'contacts-list-favorites';
    var container = document.getElementById(group);

    var newContact = renderContact(c);
    container.appendChild(newContact);
  }

  var getContactsByGroup = function gCtByGroup(errorCb, contacts) {
    if (contacts) {
      buildContacts(contacts);
      return;
    }

    var sortBy = orderByLastName ? 'familyName' : 'givenName';
    var options = {
      sortBy: sortBy,
      sortOrder: 'ascending'
    };

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      var fbReq = fb.contacts.getAll();
      fbReq.onsuccess = function() {
        buildContacts(request.result, fbReq.result);
      }
      fbReq.onerror = function() {
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

      if (!orderByLastName) {
        var aux = familyName;
        familyName = givenName;
        givenName = aux;
      } else {
        givenName = givenName.childNodes[0].nodeValue.trim();
      }

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
    var selector = 'ol h2:not(.hide)';
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

  var clearClickHandlers = function clearClickHandlers() {
    callbacks = [];
  }

  function onClickHandler(evt) {
    var dataset = evt.target.dataset;
    if (dataset && 'uuid' in dataset) {
      callbacks.forEach(function(callback) {
        callback(dataset.uuid);
      });
    }
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
    'handleClick': handleClick,
    'remove': remove,
    'loaded': loaded,
    'clearClickHandlers': clearClickHandlers,
    'setOrderByLastName': setOrderByLastName
  };
})();
