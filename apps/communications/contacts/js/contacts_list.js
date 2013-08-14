'use strict';

var contacts = window.contacts || {};
contacts.List = (function() {
  var _,
      groupsList,
      favoriteGroup,
      loaded = false,
      cancel,
      contactsListView,
      fastScroll,
      scrollable,
      settingsView,
      noContacts,
      imgLoader = null,
      orderByLastName = null,
      photoTemplate,
      headers = {},
      loadedContacts = {},
      viewHeight,
      renderTimer = null,
      toRender = [],
      releaseTimer = null,
      toRelease = [],
      monitor = null,
      loading = false,
      cancelLoadCB = null,
      photosById = {},
      clonableSelectCheck = null,
      deselectAll = null,
      selectAll = null,
      selectAllChecked = false,
      inSelectMode = false,
      selectForm = null,
      selectActionButton = null,
      groupList = null,
      searchList = null,
      selectedCount = 0;

  // Key on the async Storage
  var ORDER_KEY = 'order.lastname';

  // Possible values for the configuration field 'defaultContactsOrder'
  // config.json file (see bug 841693)
  var ORDER_BY_FAMILY_NAME = 'familyName';
  var ORDER_BY_GIVEN_NAME = 'givenName';

  var NOP_FUNCTION = function() {};

  var onscreen = function(el) {
    // Save the element reference to process in a batch from a timer callback.
    toRender.push(el);

    // Avoid rescheduling the timer if it has not run yet.
    if (renderTimer)
      return;

    renderTimer = setTimeout(doRenderTimer);
  };

  var doRenderTimer = function doRenderTimer() {
    renderTimer = null;
    monitor.pauseMonitoringMutations();
    while (toRender.length) {
      var row = toRender.shift();
      var id = row.dataset.uuid;
      renderLoadedContact(row, id);
      renderPhoto(row, id);
    }
    monitor.resumeMonitoringMutations(false);
  };

  var renderLoadedContact = function(el, id) {
    if (el.dataset.rendered)
      return;
    id = id || el.dataset.uuid;
    renderSelectCheck(el, id);
    var group = el.dataset.group;
    var contact = loadedContacts[id] ? loadedContacts[id][group] : null;
    if (!contact)
      return;
    renderContact(contact, el);
    clearLoadedContact(el, id, group);
  };

  var clearLoadedContact = function(el, id, group) {
    if (!el.dataset.rendered || !el.dataset.order || !el.dataset.search)
      return;

    id = id || el.dataset.uuid;
    group = group || el.dataset.group;
    if (loadedContacts[id])
      loadedContacts[id][group] = null;
  };

  var offscreen = function(el) {
    // Save the element reference to process in a batch from a timer callback.
    toRelease.push(el);

    // Avoid rescheduling the timer if it has not run yet.
    if (releaseTimer)
      return;

    releaseTimer = setTimeout(doReleaseTimer);
  };

  var doReleaseTimer = function doReleaseTimer() {
    releaseTimer = null;
    monitor.pauseMonitoringMutations();
    while (toRelease.length) {
      var row = toRelease.shift();
      releasePhoto(row);
    }
    monitor.resumeMonitoringMutations(false);
  };

  var init = function load(element) {
    _ = navigator.mozL10n.get;

    cancel = document.getElementById('cancel-search'),
    contactsListView = document.getElementById('view-contacts-list'),
    fastScroll = document.querySelector('nav[data-type="scrollbar"]'),
    scrollable = document.querySelector('#groups-container');
    settingsView = document.querySelector('#view-settings .view-body-inner');
    noContacts = document.querySelector('#no-contacts');

    viewHeight = scrollable.getBoundingClientRect().height;

    groupsList = document.getElementById('groups-list');
    groupsList.addEventListener('click', onClickHandler);

    initHeaders();
    favoriteGroup = document.getElementById('group-favorites').parentNode;
    var selector = 'header:not(.hide)';
    FixedHeader.init('#groups-container', '#fixed-container', selector);

    initOrder();
  };

  // Define a source adapter object to pass to contacts.Search.
  //
  // Since multiple, separate apps use contacts.Search its important for
  // the search code to function independently.  This adapter object allows
  // the search module to access the app's contacts without knowing anything
  // about our DOM structure.
  //
  // Only provide access to non-favorite nodes.  If we include favorites then
  // search may see out-of-order and duplicate values.
  var NODE_SELECTOR = 'section:not(#section-group-favorites) > ol > li';
  var searchSource = {
    getNodes: function() {
      var domNodes = contactsListView.querySelectorAll(NODE_SELECTOR);
      return Array.prototype.slice.call(domNodes);
    },

    getFirstNode: function() {
      return contactsListView.querySelector(NODE_SELECTOR);
    },

    getNextNode: function(contact) {
      var out = contact.nextElementSibling;
      var nextParent = contact.parentNode.parentNode.nextElementSibling;
      while (!out && nextParent) {
        out = nextParent.querySelector('ol > li:first-child');
        nextParent = nextParent.nextElementSibling;
      }
      return out;
    },

    // While loading we expect to feed search more nodes via the
    // contacts.Search.appendNodes() function.
    expectMoreNodes: function() {
      return loading;
    },

    // Contact nodes are not rendered until visible on screen.  To avoid
    // cloning an empty placeholder try to render the node before calling
    // cloneNode().
    clone: function(node) {
      var id = node.dataset.uuid;
      renderLoadedContact(node, id);
      renderPhoto(node, id);
      return node.cloneNode();
    },

    getNodeById: function(id) {
      return contactsListView.querySelector('[data-uuid="' + id + '"]');
    },

    // The calculation of the search text is delayed until the full list item
    // is rendered.  Therefore, it may not be available yet.  If this is the
    // case then calculate the search text before returning the value.
    getSearchText: function(node) {
      renderSearchString(node);
      return node.dataset.search;
    },

    click: onClickHandler
  }; // searchSource

  var initSearch = function initSearch(callback) {
    contacts.Search.init(searchSource, true);

    if (callback) {
      callback();
    }
  };

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
  };

  var scrollToCb = function scrollCb(domTarget, group) {
    if (domTarget.offsetTop > 0)
      scrollable.scrollTop = domTarget.offsetTop;
  };

  var load = function load(contacts, forceReset) {
    var onError = function() {
      console.log('ERROR Retrieving contacts');
    };

    var complete = function complete() {
      initOrder(function onInitOrder() {
        getContactsByGroup(onError, contacts);
      });
    };

    if (loaded || forceReset) {
      resetDom(complete);
      return;
    }

    complete();
  };

  function getFbUid(devContact) {
    var out;

    if (Array.isArray(devContact.category)) {
      var idx = devContact.category.indexOf('facebook');
      if (idx !== -1) {
        out = devContact.category[idx + 2];
      }
    }

    return out;
  }

  var initOrder = function initOrder(callback) {
    if (orderByLastName === null) {
      if (document.cookie) {
        var cookie = JSON.parse(document.cookie);
        orderByLastName = cookie.order;
        if (callback)
          callback();
      } else {
        var req = utils.config.load('/contacts/config.json');
        req.onload = function configReady(configData) {
          orderByLastName = (configData.defaultContactsOrder ===
                    ORDER_BY_FAMILY_NAME ? true : false);
          document.cookie = JSON.stringify({order: orderByLastName});
          if (callback)
            callback();
        };

        req.onerror = function configError() {
          window.console.error('Error while reading configuration file');
          orderByLastName = false;
          document.cookie = JSON.stringify({order: false});
          if (callback) {
            callback();
          }
        };
      }
    } else {
      if (callback)
        callback();
    }
  };

  var renderGroupHeader = function renderGroupHeader(group, letter) {
    var letteredSection = document.createElement('section');
    letteredSection.id = 'section-group-' + group;
    var title = document.createElement('header');
    title.id = 'group-' + group;
    title.className = 'hide';

    var letterAbbr = document.createElement('abbr');
    letterAbbr.setAttribute('title', 'Contacts listed ' + group);
    letterAbbr.textContent = letter;
    title.appendChild(letterAbbr);

    var contactsContainer = document.createElement('ol');
    contactsContainer.id = 'contacts-list-' + group;
    contactsContainer.dataset.group = group;
    letteredSection.appendChild(title);
    letteredSection.appendChild(contactsContainer);
    groupsList.appendChild(letteredSection);

    headers[group] = contactsContainer;
  };

  var renderSelectCheck = function renderSelectCheck(row, contactId) {
    if (!inSelectMode || row.dataset.selectRendered) {
      return;
    }
    var check = getSelectCheck(contactId);
    row.insertBefore(check, row.firstChildElement);
    row.dataset.selectRendered = true;
  };

  // Render basic DOM structure and text for the contact.  If a placeholder
  // has already been created then it may be provided in the optional second
  // argument.  Photos and social marks are lazy loaded.
  var renderContact = function renderContact(contact, container) {
    container = container || createPlaceholder(contact);
    var fbUid = getFbUid(contact);
    if (fbUid) {
      container.dataset.fbUid = fbUid;
    }
    container.className = 'contact-item';
    var timestampDate = contact.updated || contact.published || new Date();
    container.dataset.updated = timestampDate.getTime();
    // contactInner is a link with 3 p elements:
    // name, socaial marks and org
    var display = getDisplayName(contact);
    var nameElement = getHighlightedName(display);
    container.appendChild(nameElement);
    renderOrg(contact, container, true);

    container.dataset.rendered = true;
    return container;
  };

  // "Render" search string into node's data-search attribute.  If the
  // contact is not already known, try to look it up in our cache of loaded
  // contacts.  This is used to defer the computation of the search string
  // since profiling has shown it to be expensive.
  var renderSearchString = function renderSearchString(node, contact) {
    if (node.dataset.search)
      return;

    contact = contact || loadedContacts[node.dataset.uuid][node.dataset.group];

    if (!contact)
      return;

    var display = getDisplayName(contact);
    node.dataset.search = getSearchString(contact, display);

    clearLoadedContact(node, contact.id, node.dataset.group);
  };

  var renderOrderString = function renderOrderString(node, contact) {
    if (node.dataset.order)
      return;

    contact = contact || loadedContacts[node.dataset.uuid][node.dataset.group];

    if (!contact)
      return;

    var display = getDisplayName(contact);
    node.dataset.order = getStringToBeOrdered(contact, display);

    clearLoadedContact(node, contact.id, node.dataset.group);
  };

  // Create a mostly empty list item as a placeholder for the contact.  All
  // visibile DOM elements will be rendered later via the visibility monitor.
  // This function ensures that necessary meta data is defined in the node
  // dataset.
  var createPlaceholder = function createPlaceholder(contact, group) {
    var ph = document.createElement('li');
    ph.dataset.uuid = contact.id;
    var group = group || getFastGroupName(contact);
    var order = null;
    if (!group) {
      order = getStringToBeOrdered(contact);
      group = getGroupNameByOrderString(order);
    }
    ph.dataset.group = group;

    // NOTE: We want the group value above to be based on the raw data so that
    //       we get the und group if there is no name.  But we want to display
    //       "noName" if there is nothing reasonable to show.  So recalculate
    //       the order value if we're missing a name.  In the common case,
    //       though, avoid calculating the order string twice.

    // If we didn't change the name at all during the refill and we already
    // calculated the order string, then go ahead and save it instead of
    // recalculating it later.
    var display = getDisplayName(contact);
    if (!display.modified && order)
      ph.dataset.order = order;

    return ph;
  };

  var getStringValue = function getStringValue(contact, field) {
    if (contact[field] && contact[field][0])
      return String(contact[field][0]).trim();

    return null;
  };

  var getSearchString = function getSearchString(contact, display) {
    var display = display || contact;
    var searchInfo = [];
    var searchable = ['givenName', 'familyName'];
    searchable.forEach(function(field) {
      var value = getStringValue(display, field);
      if (value) {
        searchInfo.push(value);
      }
    });
    var value = getStringValue(contact, 'org');
    if (value) {
      searchInfo.push(value);
    }
    if (contact.tel && contact.tel.length) {
      for (var i = contact.tel.length - 1; i >= 0; i--) {
        var current = contact.tel[i];
        searchInfo.push(current.value);
      }
    }
    var escapedValue = Normalizer.escapeHTML(searchInfo.join(' '), true);
    return Normalizer.toAscii(escapedValue);
  };

  function getHighlightedName(contact, ele) {
    if (!ele) {
      ele = document.createElement('p');
    }
    var givenName = (contact.givenName && contact.givenName[0]) || '';
    var familyName = (contact.familyName && contact.familyName[0]) || '';

    function createStrongTag(content) {
      var fs = document.createElement('strong');
      fs.textContent = content;
      return fs;
    }

    if (orderByLastName) {
      ele.appendChild(document.createTextNode(givenName + ' '));
      ele.appendChild(createStrongTag(familyName));
    } else {
      ele.appendChild(createStrongTag(givenName));
      ele.appendChild(document.createTextNode(' ' + familyName));
    }
    return ele;
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

  var CHUNK_SIZE = 20;
  function loadChunk(chunk) {
    var nodes = [];
    for (var i = 0, n = chunk.length; i < n; ++i) {
      if (i === rowsPerPage)
        notifyAboveTheFold();

      var newNodes = appendToLists(chunk[i]);
      nodes.push.apply(nodes, newNodes);
    }

    if (i < rowsPerPage)
      notifyAboveTheFold();

    contacts.Search.appendNodes(nodes);
  }

  // Time until we show the first contacts "above the fold" is a very
  // important usability metric.  Emit an event when as soon as we reach
  // this point so tools can measure the time.
  var notifiedAboveTheFold = false;
  function notifyAboveTheFold() {
    if (notifiedAboveTheFold)
      return;

    notifiedAboveTheFold = true;
    PerformanceTestingHelper.dispatch('above-the-fold-ready');

    // Don't bother loading the monitor until we have rendered our
    // first screen of contacts.  This avoids the overhead of
    // onscreen() calls when adding those first contacts.
    var vm_file = '/shared/js/tag_visibility_monitor.js';
    LazyLoader.load([vm_file], function() {
      var scrollMargin = ~~(viewHeight * 1.5);
      var scrollDelta = ~~(scrollMargin / 2);
      var maxDepth = 4;
      monitor = monitorTagVisibility(scrollable, 'li', scrollMargin,
                                     scrollDelta, onscreen, offscreen);
    });
  };

  // Default to infinite rows fitting on a page and then recalculate after
  // the first row is added.
  var MAX_INT = 0x7ffffff;
  var rowsPerPage = MAX_INT;

  // Utility function for appending a newly loaded contact to both its default
  // group and, if necessary, the favorites list.
  function appendToLists(contact) {
    updatePhoto(contact);
    var ph = createPlaceholder(contact);
    var groups = [ph.dataset.group];
    if (isFavorite(contact))
      groups.push('favorites');

    var nodes = [];

    for (var i = 0, n = groups.length; i < n; ++i) {
      ph = appendToList(contact, groups[i], ph);
      nodes.push(ph);
      ph = null;
    }

    return nodes;
  }

  //Adds each contact to its group container
  function appendToList(contact, group, ph) {
    ph = ph || createPlaceholder(contact, group);
    var list = headers[group];

    // If above the fold for list, render immediately
    if (list.children.length < rowsPerPage) {
      renderContact(contact, ph);
      renderSelectCheck(ph, contact.id);

    // Otherwise save contact to render later
    }

    if (!loadedContacts[contact.id])
      loadedContacts[contact.id] = {};

    loadedContacts[contact.id][group] = contact;

    list.appendChild(ph);
    if (list.children.length === 1) {
      showGroupByList(list);
    }

    if (rowsPerPage === MAX_INT) {
      var listHeight = list.getBoundingClientRect().height;
      var rowHeight = listHeight / list.children.length;
      rowsPerPage = Math.ceil(viewHeight / rowHeight);
    }

    return ph;
  }

  // Methods executed after rendering the list
  // by first time
  var onListRendered = function onListRendered() {
    FixedHeader.refresh();

    PerformanceTestingHelper.dispatch('startup-path-done');
    fb.init(function contacts_init() {
      if (fb.isEnabled) {
        Contacts.loadFacebook(NOP_FUNCTION);
      }
      lazyLoadImages();
      loaded = true;
    });
  };

  var isFavorite = function isFavorite(contact) {
    return contact.category && contact.category.indexOf('favorite') != -1;
  };

  var lazyLoadImages = function lazyLoadImages() {
    LazyLoader.load(['/contacts/js/utilities/image_loader.js',
                     '/contacts/js/fb_resolver.js'], function() {
      if (!imgLoader) {
        imgLoader = new ImageLoader('#groups-container', 'li');
        imgLoader.setResolver(fb.resolver);
      }
      imgLoader.reload();
    });
  };

  var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
    var event = new CustomEvent(eventName);
    window.dispatchEvent(event);
  };

  // Update photo reference cache for given contact. This is used to render
  // the photo when a contact row is on screen after we've thrown away the
  // full contact object.
  var updatePhoto = function updatePhoto(contact, id) {
    id = id || contact.id;
    var prevPhoto = photosById[id];
    var newPhoto = Array.isArray(contact.photo) ? contact.photo[0] : null;

    // Do nothing if photo did not change
    if ((!prevPhoto && !newPhoto) || (prevPhoto === newPhoto)) {
      return false;
    }

    if (newPhoto) {
      photosById[id] = newPhoto;
    }
    else {
      delete photosById[id];
    }

    return true;
  };

  var hasPhoto = function hasPhoto(id) {
    return !!photosById[id];
  };

  // "Render" the photo by setting the img tag's dataset-src attribute to the
  // value in our photo cache.  This in turn will allow the imgLoader to load
  // the image once we have stopped scrolling.
  var renderPhoto = function renderPhoto(link, id) {
    id = id || link.dataset.uuid;
    var photo = photosById[id];
    if (!photo)
      return;

    var img = link.querySelector('aside > img');
    if (img) {
      try {
        img.dataset.src = window.URL.createObjectURL(photo);
      } catch (err) {
        img.dataset.src = '';
      }
      return;
    }
    if (!photoTemplate) {
      photoTemplate = document.createElement('aside');
      photoTemplate.className = 'pack-end';
      var img = document.createElement('img');
      photoTemplate.appendChild(img);
    }

    var figure = photoTemplate.cloneNode(true);
    var img = figure.children[0];
    try {
      img.dataset.src = window.URL.createObjectURL(photo);
    } catch (err) {
      img.dataset.src = '';
    }

    link.insertBefore(figure, link.children[0]);
    return;
  };

  // Remove the image for the given list item.  Leave the photo in our cache,
  // however, so the image can be reloaded later.
  var releasePhoto = function releasePhoto(el) {
    // If the imgLoader isn't ready yet, we should have nothing to release
    if (!imgLoader)
      return;

    var img = imgLoader.releaseImage(el);
    if (!img)
      return;

    img.dataset.src = '';
  };

  var renderOrg = function renderOrg(contact, link, add) {
    if (!contact.org || !contact.org.length ||
        contact.org[0] === '' || contact.org[0] === contact.givenName) {
      return;
    }
    if (add) {
      addOrgMarkup(link, contact.org[0]);
      return;
    }
    var org = link.lastElementChild.querySelector('span.org');
    org.textContent = contact.org[0];
  };

  function renderFbData(contact, link) {
    var meta;
    var elements = link.getElementsByTagName('p');
    if (elements.length == 1) {
      meta = addOrgMarkup(link);
    } else {
      meta = elements[1];
    }
    var mark = markAsFb(createSocialMark());
    var org = meta.querySelector('span.org');
    meta.insertBefore(mark, org);
    if (!contact.org || !contact.org.length) {
      mark.classList.add('notorg');
    } else {
      renderOrg(contact, link);
    }
  }


  var addOrgMarkup = function addOrgMarkup(link, content) {
    var span = document.createElement('span');
    span.className = 'org';
    if (content) {
      span.textContent = content;
    }
    var meta = document.createElement('p');
    meta.appendChild(span);
    link.appendChild(meta);
    return meta;
  };

  var toggleNoContactsScreen = function cl_toggleNoContacs(show) {
    if (show && ActivityHandler.currentlyHandling) {
      var actName = ActivityHandler.activityName;
      if (actName == 'pick' || actName == 'update') {
        showNoContactsAlert();
        return;
      }
    }
    if (show && !ActivityHandler.currentlyHandling) {
      noContacts.classList.remove('hide');
      return;
    }
    noContacts.classList.add('hide');
  };

  var showNoContactsAlert = function showNoContactsAlert() {
    var msg = _('noContactsActivity');
    var noObject = {
      title: _('ok'),
      isDanger: false,
      callback: function onNoClicked() {
        ConfirmDialog.hide();
        ActivityHandler.postCancel();
      }
    };

    ConfirmDialog.show(null, msg, noObject);
  };

  function addToFavoriteList(favorite) {
    var container = headers['favorites'];
    container.appendChild(favorite);
    if (container.children.length === 1) {
      showGroupByList(container);
    }
  }

  var getContactsByGroup = function gCtByGroup(errorCb, contacts) {
    if (!Contacts.asyncScriptsLoaded) {
      // delay loading if they're not there yet
      window.addEventListener('asyncScriptsLoaded', function listener() {
        window.removeEventListener('asyncScriptsLoaded', listener);

        getContactsByGroup(errorCb, contacts);
      });
      return;
    }
    notifiedAboveTheFold = false;
    if (contacts) {
      if (!contacts.length) {
        toggleNoContactsScreen(true);
        dispatchCustomEvent('listRendered');
        return;
      }
      toggleNoContactsScreen(false);
      loadChunk(contacts);
      onListRendered();
      dispatchCustomEvent('listRendered');
      return;
    }
    getAllContacts(errorCb, loadChunk);
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

      if (!fb.isFbContact(result)) {
        successCb(result);
        return;
      }

      var fbContact = new fb.Contact(result);
      var fbReq = fbContact.getData();
      fbReq.onsuccess = function() {
        successCb(result, fbReq.result);
      };
      fbReq.onerror = successCb.bind(null, result);
    }; // request.onsuccess

    if (typeof errorCb === 'function') {
      request.onerror = errorCb;
    }
  };

  var getAllContacts = function cl_getAllContacts(errorCb, successCb) {
    loading = true;
    initOrder(function onInitOrder() {
      var sortBy = (orderByLastName === true ? 'familyName' : 'givenName');
      var options = {
        sortBy: sortBy,
        sortOrder: 'ascending'
      };

      var cursor = navigator.mozContacts.getAll(options);
      var successCb = successCb || loadChunk;
      var num = 0;
      var chunk = [];
      cursor.onsuccess = function onsuccess(evt) {
        // Cancel this load operation if requested
        if (cancelLoadCB) {
          // XXX: If bug 870125 is ever implemented, add a cancel/stop call
          loading = false;
          var cb = cancelLoadCB;
          cancelLoadCB = null;
          return cb();
        }

        var contact = evt.target.result;
        if (contact) {
          chunk.push(contact);
          if (num && (num % CHUNK_SIZE == 0)) {
            successCb(chunk);
            chunk = [];
          }
          num++;
          cursor.continue();
        } else {
          if (chunk.length)
            successCb(chunk);
          onListRendered();
          var showNoContacs = (num === 0);
          toggleNoContactsScreen(showNoContacs);
          dispatchCustomEvent('listRendered');
          loading = false;
        }
      };
      cursor.onerror = errorCb;
    });
  };

  var addToList = function addToList(contact) {
    var renderedNode = renderContact(contact);

    // We must render all values here because the contact is not saved in
    // the loadedContacts hash when added one at a via refresh().  Therefore
    // we can not lazy render these values.
    renderSearchString(renderedNode, contact);
    renderOrderString(renderedNode, contact);

    if (updatePhoto(contact))
      renderPhoto(renderedNode, contact.id);
    var list = headers[renderedNode.dataset.group];
    addToGroup(renderedNode, list);

    // If is favorite add as well to the favorite group
    if (isFavorite(contact)) {
      list = headers['favorites'];
      var cloned = renderedNode.cloneNode();
      cloned.dataset.group = 'favorites';
      addToGroup(cloned, list);
    }
    toggleNoContactsScreen(false);
    FixedHeader.refresh();
    if (imgLoader)
      imgLoader.reload();
  };

  var hasName = function hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  };

  // Fills the contact data to display if no givenName and familyName
  var getDisplayName = function getDisplayName(contact) {
    if (hasName(contact))
      return { givenName: contact.givenName, familyName: contact.familyName };

    var givenName = [];
    if (contact.org && contact.org.length > 0) {
      givenName.push(contact.org[0]);
    } else if (contact.tel && contact.tel.length > 0) {
      givenName.push(contact.tel[0].value);
    } else if (contact.email && contact.email.length > 0) {
      givenName.push(contact.email[0].value);
    } else {
      givenName.push(_('noName'));
    }

    return { givenName: givenName, modified: true };
  };

  var addToGroup = function addToGroup(renderedNode, list) {
    renderOrderString(renderedNode);
    var newLi = renderedNode;
    var cName = newLi.dataset.order;

    var liElems = list.getElementsByTagName('li');
    var len = liElems.length;
    for (var i = 0; i < len; i++) {
      var liElem = liElems[i];

      // This may just be a placeholder that has not been rendered yet.
      // Therefore, make sure the order string has been rendered before
      // trying to compare against it.
      renderOrderString(liElem);

      var name = liElem.dataset.order;
      if (name.localeCompare(cName) >= 0) {
        list.insertBefore(newLi, liElem);
        break;
      }
    }

    if (i === len) {
      list.appendChild(newLi);
    }

    if (list.children.length === 1) {
      showGroupByList(list);
    }

    return list.children.length;
  };

  var hideGroup = function hideGroup(group) {
    var groupTitle = headers[group].parentNode.children[0];
    groupTitle.classList.add('hide');
    FixedHeader.refresh();
  };

  var showGroupByList = function showGroupByList(current) {
    var groupTitle = current.parentNode.children[0];
    groupTitle.classList.remove('hide');
    FixedHeader.refresh();
  };

  var remove = function remove(id) {
    // Could be more than one item if it's in favorites
    var items = groupsList.querySelectorAll('li[data-uuid=\"' + id + '\"]');
    // We have a node list, not an array, and we want to walk it
    Array.prototype.forEach.call(items, function removeItem(item) {
      var ol = item.parentNode;
      ol.removeChild(item);
      if (ol.children.length < 1) {
        hideGroup(ol.dataset.group);
      }
    });
    delete photosById[id];
    var selector = 'section header:not(.hide)';
    var visibleElements = groupsList.querySelectorAll(selector);
    var showNoContacts = visibleElements.length === 0;
    toggleNoContactsScreen(showNoContacts);
  };

  var getStringToBeOrdered = function getStringToBeOrdered(contact, display) {
    var ret = [];

    // If no display name is specified, then use the contact directly.  This
    // is necessary so we can use the raw contact info when generating the
    // group name.
    display = display || contact;
    var familyName, givenName;

    familyName = getStringValue(display, 'familyName') || '';
    givenName = getStringValue(display, 'givenName') || '';

    var first = givenName, second = familyName;
    if (orderByLastName) {
      first = familyName;
      second = givenName;
    }

    ret.push(first);
    ret.push(second);

    if (first != '' || second != '')
      return Normalizer.toAscii(ret.join('')).toUpperCase().trim();
    ret.push(contact.org);
    ret.push(contact.tel && contact.tel.length > 0 ?
      contact.tel[0].value.trim() : '');
    ret.push(contact.email && contact.email.length > 0 ?
      contact.email[0].value.trim() : '');
    ret.push('#');

    return Normalizer.toAscii(ret.join('')).toUpperCase().trim();
  };

  // Utility function to quickly guess the group name for the given contact.
  // Since full name normalization is expensive, we use a stripped down
  // algorithm here that catches the majority of cases; i.e. name exists and
  // starts with A-Z.  If this is not the case, then return null and force
  // the caller to use the more expensive approach.
  var getFastGroupName = function getFastGroupName(contact) {
    var field = 'givenName';
    if (orderByLastName)
      field = 'familyName';

    var value = contact[field] ? contact[field][0] : null;

    if (!value || !value.length)
      return null;

    var ret = value.charAt(0).toUpperCase();
    var code = ret.charCodeAt(0);
    if (code < 65 || code > 90)
      return null;

    return ret;
  };

  var getGroupNameByOrderString = function getGroupNameByOrderString(order) {
    var ret = order.charAt(0);  // order string is already forced to upper case
    var code = ret.charCodeAt(0);
    if (code < 65 || code > 90) {
      ret = 'und';
    }
    return ret;
  };

  // Perform contact refresh.  First arg may be either an ID or a contact
  // object.  If an ID is passed then the contact is retrieved from the
  // database.  Otherwise refresh the list based on the given contact
  // object without looking up any information.
  var refresh = function refresh(idOrContact, callback) {
    // Passed a contact, not an ID
    if (typeof(idOrContact) !== 'string') {
      refreshContact(idOrContact, null, callback);
      return;
    }

    // Passed an ID, so look up contact
    getContactById(idOrContact, function(contact, fbData) {
      var enrichedContact = null;
      if (fb.isFbContact(contact)) {
        var fbContact = new fb.Contact(contact);
        enrichedContact = fbContact.merge(fbData);
      }
      refreshContact(contact, enrichedContact, callback);
    });
  };

  var refreshContact = function refreshContact(contact, enriched, callback) {
    remove(contact.id);
    addToList(contact, enriched);
    if (callback)
      callback(contact.id);
  };

  var callbacks = [];
  var handleClick = function handleClick(callback) {
    callbacks.push(callback);
  };

  var clearClickHandlers = function clearClickHandlers() {
    callbacks = [];
  };

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
  var resetDom = function resetDom(cb) {
    if (loading) {
      cancelLoadCB = resetDom.bind(null, cb);
      return;
    }
    utils.dom.removeChildNodes(groupsList);
    loadedContacts = {};
    loaded = false;

    initHeaders();
    FixedHeader.refresh();
    if (cb)
      cb();
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
  };

  var setOrderByLastName = function setOrderByLastName(value) {
    orderByLastName = value;
  };

  /*
    In charge of providing the dom structure to create a checkbox
    for each contact row, creates it and clone a copy of a generated
    template.
  */
  var getSelectCheck = function getSelectCheck(uuid) {
    /*
      If we have our template, clone and add the uuid value,
      otherwise create the template and return a cloned modified
      value.
      http://jsperf.com/create-node-several-times-vs-clone
    */
    if (clonableSelectCheck === null) {
      clonableSelectCheck = buildSelectCheck();
    }

    var result = clonableSelectCheck.cloneNode(true);
    var check = result.firstChild;
    check.setAttribute('value', uuid);
    if (selectAllChecked) {
      check.checked = true;
    }
    return result;
  };

  /*
    Generates the dom structure for the selectable check:

    <label class="pack-checkbox">
      <input type="checkbox" name="selectIds[]" value="#uid#"></input>
      <span></span>
    </label>
  */
  var buildSelectCheck = function buildSelectCheck() {
    var label = document.createElement('label');
    label.classList.add('pack-checkbox');
    var input = document.createElement('input');
    input.name = 'selectIds[]';
    input.type = 'checkbox';
    label.appendChild(input);
    var span = document.createElement('span');
    label.appendChild(span);

    return label;
  };

  /*
    Grab the selected items, if selected, and perform
    the action specified when we entered in select mode.

    We will return a promise, that will be inmediatelly
    fullfiled when we select manually the contacts.

    If we click in select all, the promise will be resolved
    in the future, once all contacts are fecth and filter wich
    ones are selected.
  */
  var selectAction = function selectAction(action) {
    if (action == null) {
      exitSelectMode();
    }

    var selectionPromise = createSelectPromise();

    if (selectAllChecked) {
      action(selectionPromise);
      selectionPromise.resolve();
      return;
    }

    var selected = document.querySelectorAll('[name="selectIds[]"]:checked');

    if (selected.length == 0) {
      return;
    }

    var ids = [];
    selected = Array.prototype.slice.call(selected, 0);
    selected.forEach(function onSelected(contact) {
      ids.push(contact.value);
    });

    action(selectionPromise);
    selectionPromise.resolve(ids);
  };

  /*
    Controls the buttons for select all and deselect all
    when in select mode, when we click in a row or in the
    mass selection buttons.

    Second parameter is a boolean that indicates if a row was
    selected or unselected
  */
  var handleSelection = function handleSelection(evt, selected) {
    var action = null;
    if (evt) {
      evt.preventDefault();
      action = evt.target.id;
    }

    var selected = document.querySelectorAll('[name="selectIds[]"]:checked');
    var countSelected = selected.length;
    var selectAllDisabled = false;
    var deselectAllDisabled = false;

    switch (action) {
      case 'deselect-all':
        selectAllChecked = false;
        selected = Array.prototype.slice.call(selected, 0);
        selected.forEach(function onSelected(check) {
          check.checked = false;
        });

        selectedCount = 0;

        deselectAllDisabled = true;
        break;
      case 'select-all':
        selectAllChecked = true;
        var all = document.querySelectorAll('[name="selectIds[]"]');
        all = Array.prototype.slice.call(all, 0);
        all.forEach(function onAll(check) {
          check.checked = true;
        });

        selectedCount = contacts.List.total;

        selectAllDisabled = true;
        break;
      default:
        if (selected) {
          selectedCount++;
        } else {
          selectedCount--;
        }

        // We checked in a row, check the mass selection/deselection buttons
        selectAllDisabled = countSelected == contacts.List.total;
        deselectAllDisabled = countSelected == 0;
        break;
    }

    selectAll.disabled = selectAllDisabled;
    deselectAll.disabled = deselectAllDisabled;
  };

  /*
    If we perform a selection over the list of contacts
    and we don't have all the info yet, we send a promise
    to the select action.
  */
  var createSelectPromise = function createSelectPromise() {
    var promise = {
      canceled: false,
      _selected: [],
      resolved: false,
      successCb: null,
      errorCb: null,
      resolve: function resolve(values) {
        var self = this;
        setTimeout(function onResolve() {
          // If we have the values parameter we can directly
          // resolve this promise
          if (values) {
            exitSelectMode();
            self._selected = values;
            self.resolved = true;
            if (self.successCb) {
              self.successCb(values);
            }
            return;
          }

          // We don't know if we render all the contacts and their checks,
          // so fetch ALL the contacts and remove those one we un selected
          // remember this is a promise, so is already async.
          var notChecked = document.querySelectorAll(
            '[name="selectIds[]"]:not(:checked)');
          var notSelectedIds = {};
          for (var i = 0; i < notChecked.length; i++) {
            notSelectedIds[notChecked[i].value] = true;
          }
          var notSelectedCount = notChecked.length;
          var request = navigator.mozContacts.find({});
          request.onsuccess = function onAllContacts() {
            request.result.forEach(function onContact(contact) {
              if (notSelectedCount == 0 ||
                notSelectedIds[contact.id] == undefined) {
                self._selected.push(contact.id);
              }
            });

            self.resolved = true;
            exitSelectMode();
            if (self.successCb) {
              self.successCb(self._selected);
            }
          };
          request.onerror = function onError() {
            exitSelectMode();
            self.reject();
          };
        }, 0);
      },
      reject: function reject() {
        this.canceled = true;
        exitSelectMode();

        if (this.errorCb) {
          this.errorCb();
        }
      },
      set onsuccess(callback) {
        if (this.resolved) {
          callback(this._selected);
        } else {
          this.successCb = callback;
        }
      },
      set onerror(callback) {
        if (this.canceled) {
          callback();
        } else {
          this.errorCb = callback;
        }
      }
    };

    return promise;
  };

  /*
    Set the list in select mode, allowing you to configure an action to
    be executed when the user does the selection as well as a title to
    identify such action.

    Also provide a callback to be invoqued when we enter in select mode.
  */
  var selectFromList = function selectFromList(title, action, callback) {
    selectedCount = 0;
    inSelectMode = true;

    if (selectForm === null) {
      selectForm = document.getElementById('selectable-form');

      selectActionButton = document.getElementById('select-action');
      selectActionButton.addEventListener('click', function onSelected(evt) {
        selectAction(action);
      });
      selectAll = document.getElementById('select-all');
      selectAll.addEventListener('click', handleSelection);
      deselectAll = document.getElementById('deselect-all');
      deselectAll.addEventListener('click', handleSelection);
    }

    scrollable.classList.add('selecting');

    // Menus
    var menus = document.querySelectorAll(
      '#view-contacts-list menu[type="toolbar"] button');
    menus = Array.prototype.slice.call(menus, 0);
    menus.forEach(function onMenu(button) {
      button.classList.add('hide');
    });

    selectActionButton.classList.remove('hide');
    selectActionButton.textContent = title;

    // Show the select all/ deselecta ll butons
    selectForm.classList.remove('hide');

    // Setup the list in selecting mode (the search one as well)
    if (groupList == null) {
      groupList = document.getElementById('groups-list');
    }
    groupList.classList.add('selecting');
    if (searchList == null) {
      searchList = document.getElementById('search-list');
    }
    searchList.classList.add('selecting');

    // Append the checkboxes if necessary
    var domNodes = contactsListView.querySelectorAll(NODE_SELECTOR);
    domNodes = Array.prototype.slice.call(domNodes, 0);
    if (monitor != null) {
      monitor.pauseMonitoringMutations();
    }
    domNodes.forEach(function onNode(node) {
      renderSelectCheck(node, node.getAttribute('data-uuid'));
    });
    if (monitor != null) {
      monitor.resumeMonitoringMutations(false);
    }


    // Setup cancel select mode
    var close = document.getElementById('cancel_activity');
    close.removeEventListener('click', Contacts.cancel);
    close.addEventListener('click', selectAction.bind(null, null));
    close.classList.remove('hide');

    clearClickHandlers();
    handleClick(function handleSelectClick(id) {
      var check = document.querySelector('input[value="' + id + '"]');
      if (!check) {
        return;
      }

      // TODO: Find a better way to handle selection to both
      // the search list and the contacts one
      if (contacts.Search && contacts.Search.isInSearchMode) {
        contacts.Search.selectRow(id);
      }

      check.checked = !check.checked;

      handleSelection(null, check.checked);
    });

    if (callback) {
      callback();
    }

    if (contacts.List.total == 0) {
      var emptyPromise = createSelectPromise();
      emptyPromise.resolve([]);
    }
  };

  /*
    Returns back the list to it's normal behaviour
  */
  var exitSelectMode = function exitSelectMode(canceling) {
    inSelectMode = false;
    selectAllChecked = false;

    // Hide and show buttons
    selectForm.classList.add('hide');
    deselectAll.disabled = true;
    selectAll.disabled = false;
    var menus = document.querySelectorAll(
      '#view-contacts-list menu[type="toolbar"] button');
    menus = Array.prototype.slice.call(menus, 0);
    menus.forEach(function onMenu(button) {
      button.classList.remove('hide');
    });

    selectActionButton.classList.add('hide');

    // Clean the checks
    setTimeout(function clearAllChecks() {
      var all = document.querySelectorAll('[name="selectIds[]"]:checked');
      all = Array.prototype.slice.call(all, 0);
      all.forEach(function onAll(check) {
        check.checked = false;
      });
    }, 0);

    // Not in select mode
    groupList.classList.remove('selecting');
    searchList.classList.remove('selecting');
    scrollable.classList.remove('selecting');

    // Restore contact list default click handler
    clearClickHandlers();
    handleClick(Contacts.showContactDetail);

    // Restore close button
    var close = document.getElementById('cancel_activity');
    close.removeEventListener('click', selectAction);
    close.addEventListener('click', Contacts.cancel);
    close.classList.add('hide');
  };

  return {
    'init': init,
    'load': load,
    'refresh': refresh,
    'getContactById': getContactById,
    'getAllContacts': getAllContacts,
    'handleClick': handleClick,
    'initAlphaScroll': initAlphaScroll,
    'initSearch': initSearch,
    'remove': remove,
    'loaded': loaded,
    'clearClickHandlers': clearClickHandlers,
    'setOrderByLastName': setOrderByLastName,
    'renderPhoto': renderPhoto,
    'updatePhoto': updatePhoto,
    'hasPhoto' : hasPhoto,
    'renderFbData': renderFbData,
    'getHighlightedName': getHighlightedName,
    'selectFromList': selectFromList,
    get chunkSize() {
      return CHUNK_SIZE;
    },
    /*
     * Returns the number of contacts loaded in the list
     */
    get total() {
      return groupsList.querySelectorAll('li[data-uuid]').length;
    },
    get isSelecting() {
      return inSelectMode;
    }
  };
})();
