'use strict';
/* global ActivityHandler */
/* global Cache */
/* global ConfirmDialog */
/* global ContactPhotoHelper */
/* global Contacts */
/* global fb */
/* global ICEStore */
/* global ICEData */
/* global ImageLoader */
/* global LazyLoader */
/* global monitorTagVisibility */
/* global Normalizer */
/* global Loader */
/* global utils */
/* global ContactsService */
/* global HeaderUI */
/* global ICEView */
/* global Search */

var contacts = window.contacts || {};
contacts.List = (function() {
  var _,
      groupsList,
      loaded = false,
      cancel,
      contactsListView,
      fastScroll,
      scrollable,
      settingsView,
      noContacts,
      imgLoader = null,
      needImgLoaderReload = false,
      orderByLastName = null,
      defaultImage = null,
      photoTemplate,
      headers = {},
      loadedContacts = {},
      viewHeight = -1,
      rowsPerPage = -1,
      monitor = null,
      loading = false,
      cancelLoadCB = null,
      photosById = {},
      clonableSelectCheck = null,
      deselectAll = null,
      selectAll = null,
      // Used when we click on select all but the list
      // is still loading contacts.
      // Will allow new contacts created to be selected
      // even if we unselect some of them
      selectAllPending = false,
      inSelectMode = false,
      selectForm = null,
      selectActionButton = null,
      groupList = null,
      searchList = null,
      currentlySelected = 0,
      currentFilterList = null,
      numFilteredContacts = 0,
      selectNavigationController = null,
      boundSelectAction4Select = null,
      // Dictionary by contact id with the rows on screen
      rowsOnScreen = {},
      selectedContacts = {},
      _notifyRowOnScreenCallback = null,
      _notifyRowOnScreenUUID = null,
      // Will keep an array of contacts ids, not higger than
      // 2 contacts with current implementation
      iceContacts = [],
      iceGroup = null,
      forceICEGroupToBeHidden = false;

  // Possible values for the configuration field 'defaultContactsOrder'
  // config.json file (see bug 841693)
  var ORDER_BY_FAMILY_NAME = 'familyName';

  var EXPORT_TRANSITION_LEVEL = 2;
  var isDangerSelectList = false;

  var MAX_INT = 0x7fffffff;

  // Specify group short names or "letters" for those groups that have a name
  // different from something like "A" or "B".
  var GROUP_LETTERS = {
    'favorites': '',
    'und': '#'
  };

  // Define the order in which groups should appear in the list.  We allow
  // arbitrary ordering here in anticipation of additional scripts being added.
  var GROUP_ORDER = (function getGroupOrder() {
    var letters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +          // Roman
      'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ' +            // Greek
      'АБВГДЂЕЁЖЗИЙЈКЛЉМНЊОПРСТЋУФХЦЧЏШЩЭЮЯ'; // Cyrillic (Russian + Serbian)
    var order = {
      'ice': 0,
      'favorites': 1
    };
    var presetsLength = Object.keys(order).length;
    for (var i = 0; i < letters.length; i++) {
      order[letters[i]] = i + presetsLength;
    }
    order.und = i + 1;
    return order;
  })();

  var NOP_FUNCTION = function() {};

  var onscreen = function(row) {
    var id = row.dataset.uuid;
    var group = row.dataset.group;
    if (!id || !group) {
      return;
    }

    rowsOnScreen[id] = rowsOnScreen[id] || {};
    rowsOnScreen[id][group] = row;

    monitor && monitor.pauseMonitoringMutations();
    renderLoadedContact(row, id);
    updateRowStyle(row, true);
    renderPhoto(row, id, false, group);
    updateSingleRowSelection(row, id);

    // Since imgLoader.reload() causes sync reflows we only want to make this
    // call when something happens that affects our onscreen view.  Therefore
    // we defer the call until here when we know the visibility monitor has
    // detected a change and called onscreen().
    if (imgLoader && needImgLoaderReload) {
      needImgLoaderReload = false;
      imgLoader.reload();
    }

    if (_notifyRowOnScreenUUID === id) {
      _notifyRowOnScreenCallback(row);
      _clearNotifyRowOnScreenByUUID();
    }

    monitor && monitor.resumeMonitoringMutations(false);
  };

  var renderLoadedContact = function(el, id) {
    if (el.dataset.rendered) {
      return;
    }
    id = id || el.dataset.uuid;
    var group = el.dataset.group;
    var contact = loadedContacts[id] ? loadedContacts[id][group] : null;
    if (!contact) {
      return;
    }
    renderContact(contact, el);
    clearLoadedContact(el, id, group);
  };

  var clearLoadedContact = function(el, id, group) {
    if (!el.dataset.rendered || !el.dataset.order || !el.dataset.search) {
      return;
    }

    id = id || el.dataset.uuid;
    group = group || el.dataset.group;
    if (loadedContacts[id]) {
      loadedContacts[id][group] = null;
    }
  };

  var offscreen = function(row) {
    var id = row.dataset.uuid;
    var group = row.dataset.group;
    if (!id || !group) {
      return;
    }

    if (rowsOnScreen[id]) {
      delete rowsOnScreen[id][group];
    }

    monitor && monitor.pauseMonitoringMutations();
    updateRowStyle(row, false);
    var search = window.Search;
    if (!search || !search.isInSearchMode()) {
      releasePhoto(row);
    }
    monitor && monitor.resumeMonitoringMutations(false);
  };

  var init = function load(element, reset) {
    _ = navigator.mozL10n.get;

    cancel = document.getElementById('cancel-search'),
    contactsListView = document.getElementById('view-contacts-list'),
    fastScroll = document.querySelector('nav[data-type="scrollbar"]'),
    scrollable = document.querySelector('#groups-container');
    settingsView = document.querySelector('#view-settings .view-body-inner');
    noContacts = document.querySelector('#no-contacts');

    groupsList = document.getElementById('groups-list');
    groupsList.addEventListener('click', onClickHandler);

    initConfiguration();

    // Test code calls init() directly, so we may have to reset.
    if (reset) {
      resetDom();
    }

    createPhotoTemplate();

    Cache.oneviction = onCacheEvicted;
  };

  function hide() {
    contactsListView.classList.add('hide');
    if (monitor) {
      monitor.pauseMonitoringMutations();
    }
  }

  function show() {
    contactsListView.classList.remove('hide');
    needImgLoaderReload = true;
    if (monitor) {
      monitor.resumeMonitoringMutations(true);
    }
  }

  // Define a source adapter object to pass to Search.
  //
  // Since multiple, separate apps use Search its important for
  // the search code to function independently.  This adapter object allows
  // the search module to access the app's contacts without knowing anything
  // about our DOM structure.
  //
  // Sections marked as 'non searchable' will not display the fields, in this
  // case the favourites sections and the ICE section, since will provide
  // duplicate results.
  var NODE_SELECTOR = 'section:not([data-nonsearchable="true"]) > ol > li';
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
    // Search.appendNodes() function.
    expectMoreNodes: function() {
      return loading;
    },

    // Contact nodes are not rendered until visible on screen.  To avoid
    // cloning an empty placeholder try to render the node before calling
    // cloneNode().
    clone: function(node) {
      var id = node.dataset.uuid;
      renderLoadedContact(node, id);
      updateRowStyle(node, true);
      updateSingleRowSelection(node, id);
      var out = node.cloneNode(true);
      renderPhoto(out, id, true, node.dataset.group);
      return out;
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
    Search.init(searchSource, true, selectNavigationController);

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
    if (iceContacts.length > 0) {
      utils.alphaScroll.showGroup('ice');
    } else {
      utils.alphaScroll.hideGroup('ice');
    }
  };

  var scrollToCb = function scrollCb(domTarget, group) {
    if (domTarget.offsetTop > 0) {
      scrollable.scrollTop = domTarget.offsetTop;
    } else if (group === 'search-container') {
      scrollable.scrollTop = 0;
    }
  };

  var load = function load(contacts, forceReset, callback) {
    var onError = function() {
      console.log('ERROR Retrieving contacts');
    };

    var complete = function complete() {
      initConfiguration(function onInitConfiguration() {
        getContactsByGroup(onError, contacts).then(() => {
          if (typeof callback === 'function') {
            callback();
          } // Used in unit testing.
        });
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

  /**
   * Reads configuration values setup at build time to change
   * behaviour of the contacts list.
   * Receives a callback as parameter to call once the
   * parameters have been setup.
   * Also tries to save from the external file to faster cookie
   * values after the first file read.
   * @param (Function) callback function to be invoked after process
   */
  var initConfiguration = function initConfiguration(callback) {
    callback = callback || function() {};
    if (orderByLastName !== null && defaultImage !== null) {
      callback();
      return;
    }

    var config = utils.cookie.load();
    if (config) {
      orderByLastName = config.order;
      defaultImage = config.defaultImage;
      callback();
      return;
    }

    utils.config.load('/contacts/config.json').then(function ready(configData) {
      orderByLastName = (configData.defaultContactsOrder ===
                ORDER_BY_FAMILY_NAME ? true : false);
      defaultImage = configData.defaultImage === true;
      utils.cookie.update({
        order: orderByLastName,
        defaultImage: defaultImage
      });
      callback();
    }, function configError(err) {
        window.console.error('Error while reading configuration file');
        orderByLastName = utils.cookie.getDefault('order');
        defaultImage = utils.cookie.getDefault('defaultImage');
        utils.cookie.update({
          order: orderByLastName,
          defaultImage: defaultImage
        });
        callback();
    });
  };

  var renderGroupHeader = function renderGroupHeader(group, letter) {
    // Create the DOM for the group list
    var letteredSection = document.createElement('section');
    letteredSection.id = 'section-group-' + group;
    letteredSection.className = 'group-section';
    var title = document.createElement('header');
    title.id = 'group-' + group;
    title.className = 'hide';
    if (group === 'favorites') {
      letteredSection.dataset.nonsearchable = true;
    }

    var letterAbbr = document.createElement('abbr');
    var letterAbbrId = 'contacts-listed-abbr-' + group;
    letterAbbr.setAttribute('title', 'Contacts listed ' + group);
    letterAbbr.setAttribute('aria-hidden', true);
    letterAbbr.id = letterAbbrId;
    letterAbbr.textContent = letter;
    title.setAttribute('aria-labelledby', letterAbbrId);
    title.appendChild(letterAbbr);

    var contactsContainer = document.createElement('ol');
    contactsContainer.setAttribute('role', 'listbox');
    contactsContainer.setAttribute('aria-labelledby', letterAbbrId);
    contactsContainer.id = 'contacts-list-' + group;
    contactsContainer.dataset.group = group;
    letteredSection.appendChild(title);
    letteredSection.appendChild(contactsContainer);

    // Save the list off for easy access, later
    headers[group] = contactsContainer;

    // Now we must insert the new <section> into the DOM.  Since groups can
    // be created at any time we must insert the section in the correct
    // order.

    // If there are no other groups yet, then its easy.  Just append.
    if (groupsList.children.length === 0) {
      groupsList.appendChild(letteredSection);
      return;
    }

    // Determine the correct position for this group.
    var order = GROUP_ORDER[group];

    // If we cannot find a defined ordering for this group, then fall back
    // on appending.
    if (typeof order !== 'number') {
      groupsList.appendChild(letteredSection);
      return;
    }

    // Search for the correct insertion point using a simple O(n) iteration.
    // Since the number of groups is constrained and relatively small this
    // should be reasonable.
    //
    // As a minor optimization, begin iterating from the back of the list.
    // This matches the most common case of appending a new group to the
    // end which is what we need to do during first load.
    for (var i = groupsList.children.length - 1; i >= 0; --i) {
      var node = groupsList.children[i];
      var cmpGroup = node.lastChild.dataset.group;
      var cmpOrder = GROUP_ORDER[cmpGroup];
      if (cmpOrder <= order) {
        var next = node.nextSibling;
        if (next) {
          groupsList.insertBefore(letteredSection, next);
        } else {
          groupsList.appendChild(letteredSection);
        }
        break;
      }
    }

    // If we did not already insert the section, then it must belong at the
    // front of the groupsList.
    if (i < 0) {
      groupsList.insertBefore(letteredSection, groupsList.firstChild);
    }
  };

  // Retrieve the list for a given group.  Never directly access headers[].
  function getGroupList(group) {
    // If the group already exists, just return it.
    var list = headers[group];
    if (list) {
      return list;
    }

    // Otherwise we need to create group list just-in-time.

    // Determine the short name or "letter" for the group.
    var letter = GROUP_LETTERS[group];
    if (typeof letter !== 'string') {
      letter = group;
    }

    renderGroupHeader(group, letter);

    // Return the new list created by renderGroupHeader() above
    return headers[group];
  }

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
    container.setAttribute('role', 'option');
    var timestampDate = contact.updated || contact.published || new Date();
    container.dataset.updated = timestampDate.getTime();

    var check = getSelectCheck(contact.id);
    container.appendChild(check);

    // contactInner is a link with 3 p elements:
    // name, social marks and org
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
    if (node.dataset.search) {
      return;
    }

    contact = contact || loadedContacts[node.dataset.uuid][node.dataset.group];

    if (!contact) {
      return;
    }

    var display = getDisplayName(contact);
    node.dataset.search = getSearchString(contact, display);

    clearLoadedContact(node, contact.id, node.dataset.group);
  };

  var renderOrderString = function renderOrderString(node, contact) {
    if (node.dataset.order) {
      return;
    }

    contact = contact || loadedContacts[node.dataset.uuid][node.dataset.group];

    if (!contact) {
      return;
    }

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
    group = group || getFastGroupName(contact);
    var order = null;
    if (!group) {
      order = getStringToBeOrdered(contact);
      group = getGroupNameByOrderString(order);
    }
    ph.setAttribute('role', 'option');
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
    if (!display.modified && order) {
      ph.dataset.order = order;
    }

    return ph;
  };

  var getStringValue = function getStringValue(contact, field) {
    if (contact[field] && contact[field][0]) {
      return String(contact[field][0]).trim();
    }

    return null;
  };

  var getSearchString = function getSearchString(contact, display) {
    display = display || contact;
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
    ele.classList.add('contact-text');
    var bdi = document.createElement('bdi');
    var givenName = (contact.givenName && contact.givenName[0]) || '';
    var familyName = (contact.familyName && contact.familyName[0]) || '';

    function createStrongTag(content) {
      var fs = document.createElement('strong');
      fs.textContent = content;
      return fs;
    }

    if (orderByLastName) {
      bdi.appendChild(document.createTextNode(givenName + ' '));
      bdi.appendChild(createStrongTag(familyName));
    } else {
      bdi.appendChild(createStrongTag(givenName));
      bdi.appendChild(document.createTextNode(' ' + familyName));
    }

    ele.appendChild(bdi);
    return ele;
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

  var CHUNK_SIZE = 20;
  function loadChunk(chunk) {
    var nodes = [];
    for (var i = 0, n = chunk.length; i < n; ++i) {

      var newNodes = appendToLists(chunk[i]);
      nodes.push.apply(nodes, newNodes);
    }

    // If the search view has been activated by the user, then send newly
    // loaded contacts over to populate any in-progress search.  Nothing
    // to do if search is not actived.
    if (window.Search && Search.appendNodes) {
      Search.appendNodes(nodes);
    }
  }

  function loadVisibilityMonitor() {
    return new Promise((resolve) => {
      LazyLoader.load('/shared/js/tag_visibility_monitor.js', () => {
        var scrollMargin = ~~(getViewHeight() * 1.5);
        // NOTE: Making scrollDelta too large will cause janky scrolling
        //       due to bursts of onscreen() calls from the monitor.
        var scrollDelta = ~~(scrollMargin / 15);
        monitor = monitorTagVisibility(scrollable, 'li', scrollMargin,
                                       scrollDelta, onscreen, offscreen);
        resolve();
      });
    });
  }

  function getViewHeight(config) {
    if (viewHeight < 0) {
      config = config || utils.cookie.load();
      if (config && config.viewHeight > -1) {
        viewHeight = config.viewHeight;
      } else {
        viewHeight = scrollable.getBoundingClientRect().height;
        // If the groups list is hiden, we'll get no height and so we don't
        // store it.
        if (viewHeight) {
          utils.cookie.update({viewHeight: viewHeight});
        }
      }
    }
    return viewHeight;
  }

  function getRowsPerPage() {
    if (rowsPerPage < 0) {
      var config = utils.cookie.load();
      if (config && config.rowsPerPage > -1) {
        rowsPerPage = config.rowsPerPage;
      }
    }

    // If we couldn't load from config, then return max int since we can't
    // calculate yet
    if (rowsPerPage < 0) {
      return MAX_INT;
    }

    // Otherwise return loaded config value
    return rowsPerPage;
  }

  function setRowsPerPage(row) {
    if (rowsPerPage > -1) {
      return;
    }

    var rowHeight = row.getBoundingClientRect().height;
    rowsPerPage = Math.ceil(getViewHeight() / rowHeight);
    utils.cookie.update({rowsPerPage: rowsPerPage});
  }

  // Utility function for appending a newly loaded contact to both its default
  // group and, if necessary, the favorites list.
  function appendToLists(contact) {
    updatePhoto(contact);
    var ph = createPlaceholder(contact);
    var groups = [ph.dataset.group];
    if (isFavorite(contact)) {
      groups.push('favorites');
    }

    var nodes = [];

    for (var i = 0, n = groups.length; i < n; ++i) {
      ph = appendToList(contact, groups[i], ph);
      nodes.push(ph);
      ph = null;
    }

    selectedContacts[contact.id] = selectAllPending;

    return nodes;
  }

  // Adds each contact to its group container
  function appendToList(contact, group, ph) {
    ph = ph || createPlaceholder(contact, group);
    var list = getGroupList(group);

    var inCache = Cache.active &&
                  (Cache.hasContact(contact.id)) ||
                  (group == 'favorites' && Cache.hasFavorite(contact.id));

    // If above the fold for list or if the contact is in the cache,
    // create the DOM node. If the contact is in the cache and has not
    // changed, we won't append it to the DOM.
    if (list.children.length < getRowsPerPage() || inCache) {
      renderContact(contact, ph);
    }

    if (!loadedContacts[contact.id]) {
      loadedContacts[contact.id] = {};
    }

    loadedContacts[contact.id][group] = contact;

    var previousNode;

    // If the contact is in the cache but nothing changed, we bail out.
    // Otherwise, we remove the DOM node and let the flow continue so we
    // can append the new node with the updated information.
    if (inCache) {
      var cachedContact;
      if (group == 'favorites') {
        cachedContact = Cache.getFavorite(contact.id);
      } else {
        cachedContact = Cache.getContact(contact.id);
      }
      // We don't add Facebook information while creating the placeholder,
      // this information is added afterwards in renderFbData.
      // Because of that, we need to get rid of the additional information
      // from the cached contact before checking against the original contact
      // information.
      if (contact.category &&
          contact.category.indexOf('facebook') != -1) {
        var separator =
          '<p class="contact-text"><span class="icon-social';
        cachedContact = cachedContact.split(separator)[0];
      }

      if (cachedContact === ph.innerHTML) {
        ph = null;
        return;
      }
      var toReplace = list.querySelector('li[data-uuid=\"' +
                                         contact.id + '\"]');
      previousNode = toReplace.nextElementSibling;
      toReplace.parentNode.removeChild(toReplace);
    }

    // It is possible that a new contact has been added while the app was
    // closed. In that case, we need to check if the new contact needs
    // to be inserted in the first chunk so it is later cached.
    if (Cache.active && (Cache.updated < contact.updated)) {
      renderOrderString(ph, contact);
      if (Cache.lastOrderString > ph.dataset.order) {
        var listElements = list.getElementsByTagName('li');
        var insertAt = searchNodes(listElements, ph.dataset.order);
        previousNode = listElements[insertAt];
      }
    }

    if (previousNode) {
      list.insertBefore(ph, previousNode);
    } else {
      list.appendChild(ph);
    }

    if (list.children.length === 1) {
      showGroupByList(list);
      setRowsPerPage(list.firstChild);
    }

    return ph;
  }

  // Methods executed after rendering the list
  // by first time
  var onListRendered = function onListRendered() {
    // We cancel any pending intent of selection
    // Now any new contact added to the list will
    // be selected just if we clicked on select all
    // and we didn't unselected any other contact
    selectAllPending = false;

    loadVisibilityMonitor();

    // Replacing old message 'startup-path-done'
    utils.PerformanceHelper.loadEnd();
    LazyLoader.load([
     '/contacts/js/fb/fb_init.js',
     '/contacts/js/fb_loader.js',
     '/shared/js/contacts/utilities/image_loader.js'
    ], () => {
      fb.init(function contacts_init() {
        if (fb.isEnabled) {
          Contacts.loadFacebook(NOP_FUNCTION);
        }
        lazyLoadImages();
        loaded = true;
      });
    });

    loadICE().then(() => {
      if (Cache.enabled) {
        // Once we've rendered the whole list, we can check if what we added
        // in the cached chunk is valid.
        verifyAndRebuildCache();
      }
    });
  };

  /**
   * Check if we have ICE contacts information
   */
  var ICELoaded;
  function loadICE() {
    if (ICELoaded) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      LazyLoader.load([
        '/contacts/js/utilities/ice_data.js',
        '/shared/js/contacts/utilities/ice_store.js'],
       function() {
        ICEStore.getContacts().then((ids) => {
          ICELoaded = true;
          displayICEIndicator(ids);
          resolve();
        });
        ICEStore.onChange(function() {
          ICEStore.getContacts().then(displayICEIndicator);
        });
      });
    });
  }

  function displayICEIndicator(ids) {
    if (!iceGroup) {
      buildICEGroup();
    } else {
      addICEListeners();
    }

    if (!ids || !ids.length) {
      hideICEGroup();
      return;
    }

    iceContacts = ids;

    showICEGroup();
  }

  function toggleICEGroup(show) {
    if (!iceGroup) {
      return;
    }

    forceICEGroupToBeHidden = !(!!show);
    forceICEGroupToBeHidden ? hideICEGroup() : showICEGroup();
  }

  function showICEGroup() {
    // If the ICE group has been hidden programmatically by means of
    // <toggleICEGroup> it will only be displayed again using the same
    // mechanism regardless updates.
    if (forceICEGroupToBeHidden) {
      return;
    }
    iceGroup.classList.remove('hide');
    utils.alphaScroll.showGroup('ice');
  }

  function hideICEGroup() {
    iceGroup.classList.add('hide');
    utils.alphaScroll.hideGroup('ice');
  }

  function buildICEGroup() {
    iceGroup = document.createElement('section');
    iceGroup.classList.add('group-section');
    iceGroup.id = 'section-group-ice';
    iceGroup.dataset.nonsearchable = true;
    var list = document.createElement('ol');
    list.dataset.group = 'ice';
    list.id = 'contact-list-ice';
    list.role = 'listbox';
    var elem = document.createElement('li');
    elem.classList.add('contact-item');
    elem.dataset.group = 'ice';
    var icon = document.createElement('span');
    icon.src = '/contacts/style/images/icon_ice.png';
    var p = document.createElement('p');
    p.classList.add('contact-text');
    p.setAttribute('data-l10n-id', 'ICEContactsGroup');

    groupsList.insertBefore(iceGroup, groupsList.firstChild)
              .appendChild(list).appendChild(elem);
    elem.appendChild(icon);
    elem.appendChild(p);

    addICEListeners();
  }

  function addICEListeners() {
    if (!Cache.active) {
      iceGroup.addEventListener('click', onICEGroupClicked);
    }

    // Set a listener in case ice contacts are modified
    // and we need to remove the group.
    ICEData.listenForChanges(function(data) {
      if (!Array.isArray(data) || data.length === 0) {
        hideICEGroup();
      }
    });
  }

  function onICEGroupClicked() {
    loadICE().then(() => {
      LazyLoader.load('/shared/js/contacts/utilities/image_loader.js', () => {
        Loader.view('Ice', function() {
          // Prebuild the rows here, we have all the data to
          // build them. Current amount of rows is 2.
          function rowBuilder(id, node) {
            renderLoadedContact(node, id);
            updateRowStyle(node, true);
            updateSingleRowSelection(node, id);
            var out = node.cloneNode(true);
            renderPhoto(out, id, true, out.dataset.group);
            return out;
          }
          ICEView.init(iceContacts, rowBuilder, onClickHandler);
          ICEView.showICEList();
        });
      });
    });
  }

  var isFavorite = function isFavorite(contact) {
    return contact.category && contact.category.indexOf('favorite') != -1;
  };

  var lazyLoadImages = function lazyLoadImages() {
    LazyLoader.load(['/shared/js/contacts/utilities/image_loader.js',
                     '/contacts/js/fb_resolver.js'], function() {
      if (!imgLoader) {
        imgLoader = new ImageLoader('#groups-container',
                                    'li:not([data-group="ice"])');
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
    var newPhoto = ContactPhotoHelper.getThumbnail(contact);

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

  // Utility function to manage the dataset-src URL for images.  Its important
  // to only modify this attribute from this function in order to ensure that
  // the URLs are properly revoked.
  function setImageURL(img, photo, asClone) {
    var oldURL = img.dataset.src;
    if (oldURL) {
      if (!asClone) {
        window.URL.revokeObjectURL(oldURL);
      }
      img.dataset.src = '';
    }
    if (photo) {
      try {
        img.dataset.src = window.URL.createObjectURL(photo);
      } catch (err) {
        // Warn, but do nothing else.  We cleared the old URL above.
        console.warn('Failed to create URL for contacts image blob: ' + photo +
                     ', error: ' + err);
      }
    }
  }

  // "Render" the photo by setting the img tag's dataset-src attribute to the
  // value in our photo cache. This in turn will allow the imgLoader
  // to load the image once we have stopped scrolling.
  // We set dataset-group with the group letter
  // if the contact doesn't have photo.
  var renderPhoto = function renderPhoto(link, id, asClone, group) {
    id = id || link.dataset.uuid;
    var img = link.querySelector('aside > span[data-type=img]');

    var photo = photosById[id];
    if (!photo) {
      if (defaultImage) {
        renderDefaultPhoto(img, link, group);
      }
      return;
    }

    if (img) {
      delete img.dataset.group;
      img.style.backgroundPosition = img.dataset.backgroundPosition || '';
      setImageURL(img, photo, asClone);
      return;
    }

    var figure = photoTemplate.cloneNode(true);
    img = figure.children[0];
    setImageURL(img, photo);

    link.insertBefore(figure, link.children[0]);
    return;
  };

  /**
   * Build the template used for displaying the thumbnail
   * image.
   */
  function createPhotoTemplate() {
    if (photoTemplate) {
      return;
    }
    photoTemplate = document.createElement('aside');
    photoTemplate.setAttribute('aria-hidden', true);
    photoTemplate.className = 'pack-end';
    var img = document.createElement('span');
    img.dataset.type = 'img';
    photoTemplate.appendChild(img);
  }

  /**
   * Renders the default image for a contact using a random
   * position of a background image and the group letter
   */
  var renderDefaultPhoto =
    function renderDefaultPhoto(img, link, group) {
    if (!img) {
      var figure = photoTemplate.cloneNode(true);
      img = figure.children[0];

      img.dataset.backgroundPosition = img.style.backgroundPosition;

      var posH = ['left','center','right'];
      var posV = ['top','center','bottom'];
      var position =
        posH[Math.floor(Math.random() * 3)] + ' ' +
        posV[Math.floor(Math.random() * 3)];

      img.style.backgroundPosition = position;

      link.insertBefore(figure, link.children[0]);
    }

    // Special groups
    if (group === 'favorites') {
      // Recalculate group
      var contact = loadedContacts[link.dataset.uuid][group];
      var order = getStringToBeOrdered(contact);
      group = getGroupNameByOrderString(order);
    }
    if (group === 'und') {
      group = '#';
    }
    img.dataset.group = group;

  };

  // Remove the image for the given list item.  Leave the photo in our cache,
  // however, so the image can be reloaded later.
  var releasePhoto = function releasePhoto(el) {
    // If the imgLoader isn't ready yet, we should have nothing to release
    if (!imgLoader) {
      return;
    }

    var img = imgLoader.releaseImage(el);
    if (!img) {
      return;
    }

    setImageURL(img, null);
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

    // We may already have added the social mark.
    var mark = link.querySelector('span.icon-social');
    if (!mark) {
      mark = markAsFb(createSocialMark());
    }

    var org = meta.querySelector('span.org');
    meta.insertBefore(mark, org);
    if (!contact.org || !contact.org.length) {
      mark.classList.add('notorg');
    } else {
      renderOrg(contact, link);
    }

    // Additional Facebook data starts coming after we already
    // rendered the list. At that point we already built the
    // cache without this information. To avoid flashing the
    // screen repainting it with this new information, we request
    // a new cache refresh if we are adding the info to a node
    // that belongs to the cache. Because we are throttling cache
    // refresh requests, this shouldn't be too expensive.
    // Life can be hard sometimes.
    if (Cache.enabled && link.dataset.cache) {
      cacheContactsList();
    }
  }

  var addOrgMarkup = function addOrgMarkup(link, content) {
    var span = document.createElement('span');
    span.className = 'org';
    if (content) {
      span.textContent = content;
    }
    var meta = document.createElement('p');
    meta.classList.add('contact-text');
    meta.appendChild(span);
    link.appendChild(meta);
    return meta;
  };

  var toggleNoContactsScreen = function cl_toggleNoContacs(show) {
    if (show) {
      if (!ActivityHandler.currentlyHandling) {
        noContacts.classList.remove('hide');
        fastScroll.classList.add('hide');
        scrollable.classList.add('hide');
        return;
      }

      if (ActivityHandler.currentActivityIs(['pick', 'update'])) {
        showNoContactsAlert();
        return;
      }
    }
    noContacts.classList.add('hide');
    fastScroll.classList.remove('hide');
    scrollable.classList.remove('hide');
  };

  var showNoContactsAlert = function showNoContactsAlert() {
    var msg = 'noContactsActivity2';
    var noObject = {
      title: 'ok',
      isDanger: false,
      callback: function onNoClicked() {
        ConfirmDialog.hide();
        ActivityHandler.postCancel();
      }
    };

    ConfirmDialog.show(null, msg, noObject);
  };

  var getContactsByGroup = function gCtByGroup(errorCb, contacts) {
    return Contacts.asyncScriptsLoaded.then(() => {
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
    });
  };

  var getAllContacts = function cl_getAllContacts(errorCb, successCb) {
    if (Cache.active) {
      headers = Cache.headers;
      iceGroup = document.getElementById('section-group-ice');
      iceGroup.addEventListener('click', onICEGroupClicked);
    }
    loading = true;

    if (!successCb) {
      successCb = loadChunk;
    }
    initConfiguration(function onInitConfiguration() {
      var num = 0;
      var chunk = [];

      ContactsService.getAllStreamed(
        (orderByLastName === true ? 'familyName' : 'givenName'),
        function onContact(contact) {
          chunk.push(contact);
          if (num && (num % CHUNK_SIZE === 0)) {
            successCb(chunk);
            chunk = [];
          }
          num++;
        },
        errorCb,
        function onComplete() {
          if (chunk.length) {
            successCb(chunk);
          }
          var showNoContacs = (num === 0);
          toggleNoContactsScreen(showNoContacs);
          onListRendered();
          dispatchCustomEvent('listRendered');
          loading = false;
        }
      );
    });
  };

  var addToList = function addToList(contact) {
    var renderedNode = renderContact(contact);

    // We must render all values here because the contact is not saved in
    // the loadedContacts hash when added one at  via refresh().  Therefore
    // we can not lazy render these values.
    renderSearchString(renderedNode, contact);
    renderOrderString(renderedNode, contact);

    if (updatePhoto(contact)) {
      renderPhoto(renderedNode, contact.id);
    }
    var list = getGroupList(renderedNode.dataset.group);
    addToGroup(renderedNode, list);

    if (!loadedContacts[contact.id]) {
      loadedContacts[contact.id] = {};
    }

    loadedContacts[contact.id][renderedNode.dataset.group] = contact;

    // If it is favorite add as well to the favorite group
    if (isFavorite(contact)) {
      list = getGroupList('favorites');
      loadedContacts[contact.id].favorites = contact;
      var cloned = renderedNode.cloneNode(true);
      cloned.dataset.group = 'favorites';
      renderPhoto(cloned, contact.id, false, 'favorites');
      addToGroup(cloned, list);
    }
    toggleNoContactsScreen(false);

    // Avoid calling imgLoader.reload() here because it causes a sync reflow
    // of the entire list.  Ideally it would only do this if the new contact
    // was added on screen or earlier, but unfortunately it doesn't have
    // enough information.  The visibility monitor, however, does have this
    // information.  Therefore set a flag here and then defer the reload until
    // the next monitor onscreen() call.
    if (imgLoader) {
      needImgLoaderReload = true;
    }

    // When we add a new contact to the list we will by default
    // select it depending on this two cases:
    // 1. We have a pending select all, new contacts add will be selected
    // 2. List is loaded (so no select pending), but the button for select
    //    all the contact is clicked, so we add it as selected
    selectedContacts[contact.id] = selectAllPending ||
      (selectAll && selectAll.disabled);
  };

  var hasName = function hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  };

  // Fills the contact data to display if no givenName and familyName
  var getDisplayName = function getDisplayName(contact) {
    if (hasName(contact)) {
      return { givenName: contact.givenName, familyName: contact.familyName };
    }

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

  // Search the given array of DOM li nodes using a binary search.  Return
  // the index that the new node should be inserted before.
  function searchNodes(nodes, name) {
    var len = nodes.length;
    var begin = 0;
    var end = len;
    var comp = 0;
    var target = len;
    while (begin <= end) {
      target = ~~((begin + end) / 2);
      if (target >= len) {
        break;
      }
      var targetNode = nodes[target];
      renderOrderString(targetNode);
      var targetName = targetNode.dataset.order;
      comp = name.localeCompare(targetName);
      if (comp < 0) {
        end = target - 1;
      } else if (comp > 0) {
        begin = target + 1;
      } else {
        return target;
      }
    }

    if (target >= len) {
      return len;
    }

    if (comp <= 0) {
      return target;
    }

    return target + 1;
  }

  var addToGroup = function addToGroup(renderedNode, list) {
    renderOrderString(renderedNode);
    var newLi = renderedNode;
    var cName = newLi.dataset.order;

    var liElems = list.getElementsByTagName('li');
    var insertAt = searchNodes(liElems, cName);
    if (insertAt < liElems.length) {
      list.insertBefore(newLi, liElems[insertAt]);
    } else {
      list.appendChild(newLi);
    }

    if (list.children.length === 1) {
      showGroupByList(list);
    }

    return list.children.length;
  };

  var hideGroup = function hideGroup(group) {
    var groupTitle = getGroupList(group).parentNode.children[0];
    groupTitle.classList.add('hide');
  };

  var showGroupByList = function showGroupByList(current) {
    var groupTitle = current.parentNode.children[0];
    groupTitle.classList.remove('hide');
  };

  var remove = function remove(id) {
    // Could be more than one item if it's in favorites
    var items = groupsList.querySelectorAll('li[data-uuid=\"' + id + '\"]');
    if (!items || !items.length) {
      return;
    }
    // We have a node list, not an array, and we want to walk it
    Array.prototype.forEach.call(items, function removeItem(item) {
      var ol = item.parentNode;
      ol.removeChild(item);
      if (ol.children.length < 1) {
        hideGroup(ol.dataset.group);
      }
    });
    if (photosById[id]) {
      delete photosById[id];
    }
    var selector = 'section header:not(.hide)';
    var visibleElements = groupsList.querySelectorAll(selector);
    var showNoContacts = visibleElements.length === 0;
    toggleNoContactsScreen(showNoContacts);

    if (selectedContacts[id] !== undefined) {
      delete selectedContacts[id];
    }
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

    if (first !== '' || second !== '') {
      return Normalizer.toAscii(ret.join('')).toUpperCase().trim();
    }
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
  // starts with a known letter.  If this is not the case, then return null
  // and force the caller to use the more expensive approach.
  var getFastGroupName = function getFastGroupName(contact) {
    var field = orderByLastName ? 'familyName' : 'givenName';
    var value = contact[field] ? contact[field][0] : null;
    if (!value || !value.length) {
      return null;
    }

    var ret = value.charAt(0).toUpperCase();
    if (!(ret in GROUP_ORDER)) {
      return null;
    }
    return ret;
  };

  var getGroupNameByOrderString = function getGroupNameByOrderString(order) {
    var ret = order.charAt(0);  // order string is already forced to upper case
    if (!(ret in GROUP_ORDER)) {
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


    ContactsService.get(idOrContact, function(contact) {
      refreshContact(contact, null, callback);
    });
  };

  function refreshContact(contact, enriched, callback) {
    remove(contact.id);
    addToList(contact, enriched);
    if (window.Search) {
      Search.updateSearchList(function() {
        if (callback) {
          callback(contact.id);
        }
      });
    } else if (callback) {
      callback(contact.id);
    }
  }

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
    iceGroup = null;
    ICELoaded = false;
    utils.dom.removeChildNodes(groupsList);
    headers = {};
    loadedContacts = {};
    loaded = false;

    if (cb) {
      cb();
    }
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
    label.classList.add('contact-checkbox');
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
    in the future, once all contacts are fetched and the
    ones selected are filtered.
  */
  var selectAction = function selectAction(action) {
    updateSelectCount(0);
    if (action == null) {
      exitSelectMode();
      return;
    }

    var selectionPromise = createSelectPromise();

    // If we are in the middle of a pending select all
    // (we clicked and the list is still not completely loaded)
    // we fire the resolve of the promise without parameters,
    // indicating that we need to fetch again the contacts
    // and remove from the final result those one that
    // were unchecked (if any)
    if (selectAllPending) {
      action(selectionPromise, exitSelectMode);
      selectionPromise.resolve();
      return;
    }

    var ids = [];
    for (var id in selectedContacts) {
      if (selectedContacts[id]) {
        ids.push(id);
      }
    }

    if (ids.length === 0) {
      return;
    }

    action(selectionPromise, exitSelectMode);
    selectionPromise.resolve(ids);
  };

  /*
    Controls the buttons for select all and deselect all
    when in select mode, when we click in a row or in the
    mass selection buttons.

    Second parameter is a boolean that indicates if a row was
    selected or unselected
  */
  var handleSelection = function handleSelection(evt) {
    var action = null;
    if (evt) {
      evt.preventDefault();
      action = evt.target.id;
    }

    var selectAllDisabled = false;
    var deselectAllDisabled = false;
    currentlySelected = countSelectedContacts();

    switch (action) {
      case 'deselect-all':
        selectAllPending = false;
        deselectAllContacts();
        currentlySelected = 0;

        deselectAllDisabled = true;
        break;
      case 'select-all':
        selectAllPending = true && !loaded;
        selectAllContacts();

        currentlySelected = contacts.List.total - numFilteredContacts;

        selectAllDisabled = true;
        break;
      default:
        // We checked in a row, check the mass selection/deselection buttons
        selectAllDisabled = currentlySelected == contacts.List.total;
        deselectAllDisabled = currentlySelected === 0;
        break;
    }

    updateRowsOnScreen();

    selectActionButton.disabled = currentlySelected === 0;
    selectAll.disabled = selectAllDisabled;
    deselectAll.disabled = deselectAllDisabled;
    updateSelectCount(currentlySelected);
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
          var notSelectedIds = {};
          for (var id in selectedContacts) {
            if (!selectedContacts[id]) {
              notSelectedIds[id] = true;
            }
          }
          var notSelectedCount = Object.keys(notSelectedIds).length;

          ContactsService.getAll(function(e, contacts) {
            if (e) {
              self.reject();
              return;
            }
            contacts.forEach(function onContact(contact) {
              if (notSelectedCount === 0 ||
                notSelectedIds[contact.id] === undefined) {
                self._selected.push(contact.id);
              }
            });
            self.resolved = true;
            if (self.successCb) {
              self.successCb(self._selected);
            }
          });
        }, 0);
      },
      reject: function reject() {
        this.canceled = true;

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

  function doSelectFromList(title, action, callback, options) {
    if (selectForm === null) {
      selectForm = document.getElementById('selectable-form');
      selectActionButton = document.getElementById('select-action');
      selectActionButton.disabled = true;
      selectAll = document.getElementById('select-all');
      selectAll.addEventListener('click', handleSelection);
      deselectAll = document.getElementById('deselect-all');
      deselectAll.addEventListener('click', handleSelection);

      selectForm.querySelector('#selectable-form-header').
                    addEventListener('action', exitSelectMode.bind(null, true));
    }

    isDangerSelectList = options && options.isDanger;

    scrollable.classList.add('selecting');
    fastScroll.classList.add('selecting');
    utils.alphaScroll.toggleFormat('short');

    selectActionButton.textContent = title;
    // Clear any previous click action and setup the current one
    selectActionButton.removeEventListener('click', boundSelectAction4Select);
    boundSelectAction4Select = selectAction.bind(null, action);
    selectActionButton.addEventListener('click', boundSelectAction4Select);

    updateSelectCount(0);
    selectForm.classList.remove('hide');
    selectForm.addEventListener('transitionend', function handler() {
      selectForm.removeEventListener('transitionend', handler);
      selectForm.classList.add('in-edit-mode');
    });

    // Give the opportunity to paint
    window.setTimeout(function() {
      selectForm.classList.add('contacts-select');
    });

    // Setup the list in selecting mode (the search one as well)
    if (groupList == null) {
      groupList = document.getElementById('groups-list');
    }
    groupList.classList.add('selecting');
    if (searchList == null) {
      searchList = document.getElementById('search-list');
    }
    searchList.classList.add('selecting');

    if (options && Array.isArray(options.filterList)) {
      currentFilterList = options.filterList;
      numFilteredContacts = 0;

      currentFilterList.forEach(function(filter) {
        groupList.classList.add(filter.containerClass);
        searchList.classList.add(filter.containerClass);
        numFilteredContacts += filter.numFilteredContacts;
      });

      if (contacts.List.total == numFilteredContacts) {
        selectAll.disabled = true;
      }
    }

    updateRowsOnScreen();

    clearClickHandlers();
    handleClick(function handleSelectClick(id, row) {
      selectedContacts[id] = !selectedContacts[id];
      updateRowSelection([id]);
      handleSelection(null);
      if (window.Search && Search.isInSearchMode()) {
        Search.selectRow(id, selectedContacts[id]);
      }
    });

    if (callback) {
      callback();
    }

    if (contacts.List.total === 0) {
      var emptyPromise = createSelectPromise();
      emptyPromise.resolve([]);
    }
  }

  /*
    Set the list in select mode, allowing you to configure an action to
    be executed when the user does the selection as well as a title to
    identify such action.

    Also provide a callback to be invoked when we enter in select mode.

    The 'options' object allows to filter out contacts passing an array of
    objects composed of a 'containerClass' string, which will be applied to the
    contact list, and a 'numFilteredContacts' integer, which tells the number
    of contacts that will be affected. As an example, to filter out FB contacts:

      options = {
        'filterList': [
          {
            'containerClass' : 'disable-fb-items',
            'numFilteredContacts' : 42
          }
        ]
      };
  */
  var selectFromList = function selectFromList(title, action, callback,
      navigationController, options) {
    inSelectMode = true;
    selectNavigationController = navigationController;

    // As the transition duration is long, we must avoid clicking on settings
    // buttons (bug 1050843)
    document.getElementById('settings-button').classList.add('hide');
    document.getElementById('settings-close').disabled = true;
    document.getElementById('add-contact-button').classList.add('hide');

    if (options && options.transitionLevel === EXPORT_TRANSITION_LEVEL) {
      selectNavigationController.back(function() {
        Contacts.goBack(function() {
          doSelectFromList(title, action, callback, options);
        });
      });
    }
    else {
      Contacts.goBack(function() {
        doSelectFromList(title, action, callback, options);
      });
    }
  };

  var updateRowsOnScreen = function updateRowsOnScreen() {
    // Update style of nodes on screen
    if (monitor != null) {
      monitor.pauseMonitoringMutations();
    }
    var row;
    for (var id in rowsOnScreen) {
      for (var group in rowsOnScreen[id]) {
        row = rowsOnScreen[id][group];
        updateRowStyle(row, true);
        updateSingleRowSelection(row, id);
      }
    }
    if (monitor != null) {
      monitor.resumeMonitoringMutations(false);
    }
  };

  // TODO: Disable checkboxes for Facebook contacts depending on config
  // Shows, hides the selection check depending if the row is
  // on the screen.
  var updateRowStyle = function updateRowStyle(row, onscreen) {
    if (inSelectMode && onscreen) {
      if (!row.dataset.selectStyleSet) {
        utils.dom.addClassToNodes(row, '.contact-checkbox',
                             'contact-checkbox-selecting');
        utils.dom.addClassToNodes(row, '.contact-text',
                             'contact-text-selecting');
        row.dataset.selectStyleSet = true;
      }

      var label = row.querySelector('label');
      if (isDangerSelectList) {
        label.classList.add('danger');
      }
      else {
        label.classList.remove('danger');
      }
    } else if (row.dataset.selectStyleSet) {
      utils.dom.removeClassFromNodes(row, '.contact-checkbox-selecting',
                                'contact-checkbox-selecting');
      utils.dom.removeClassFromNodes(row, '.contact-text-selecting',
                                'contact-text-selecting');
      delete row.dataset.selectStyleSet;
    }
  };

  // Update the selection status given a list of ids
  var updateRowSelection = function updateRowSelection(idToUpdate) {
    for (var id in rowsOnScreen) {
      for (var group in rowsOnScreen[id]) {
        var row = rowsOnScreen[id][group];
        if (idToUpdate === id) {
          updateSingleRowSelection(row, id);
        }
      }
    }
  };

  // Given a row, and the contact id, setup the value of the selection check
  var updateSingleRowSelection = function updateSingleRowSelection(row, id) {
    id = id || row.dataset.uuid;
    var check = row.querySelector('input[value="' + id + '"]');
    if (!check) {
      return;
    }

    check.checked = !!selectedContacts[id];
  };

  var selectAllContacts = function selectAllContacts() {
    for (var id in selectedContacts) {
      selectedContacts[id] = true;
    }
  };

  var deselectAllContacts = function deselectAllContacts() {
    for (var id in selectedContacts) {
      selectedContacts[id] = false;
    }
  };

  var countSelectedContacts = function countSelectedContacts() {
    var counter = 0;
    for (var id in selectedContacts) {
      if (selectedContacts[id]) {
        counter++;
      }
    }

    return counter;
  };

  /*
    Returns back the list to it's normal behaviour
  */
  var exitSelectMode = function exitSelectMode(canceling) {
    isDangerSelectList = false;

    document.getElementById('settings-button').classList.remove('hide');
    document.getElementById('add-contact-button').classList.remove('hide');
    document.getElementById('settings-close').disabled = false;

    selectForm.addEventListener('transitionend', function handler() {
      selectForm.removeEventListener('transitionend', handler);
      window.setTimeout(function() {
        selectForm.classList.add('hide');
      });
    });

    selectForm.classList.remove('in-edit-mode');
    selectForm.classList.remove('contacts-select');

    inSelectMode = false;
    selectAllPending = false;
    currentlySelected = 0;
    deselectAllContacts();

    deselectAll.disabled = true;
    selectAll.disabled = false;

    selectActionButton.disabled = true;

    // Not in select mode
    groupList.classList.remove('selecting');
    searchList.classList.remove('selecting');
    scrollable.classList.remove('selecting');
    fastScroll.classList.remove('selecting');
    utils.alphaScroll.toggleFormat('normal');

    if (Array.isArray(currentFilterList)){
      currentFilterList.forEach(function(filter) {
        groupList.classList.remove(filter.containerClass);
        searchList.classList.remove(filter.containerClass);
      });
      currentFilterList = null;
      numFilteredContacts = 0;
    }

    updateRowsOnScreen();

    // Restore contact list default click handler
    clearClickHandlers();
    handleClick(Contacts.showContactDetail);
  };

  var refreshFb = function resfreshFb(uid) {
    var selector = '[data-fb-uid="' + uid + '"]';
    var node = document.querySelector(selector);
    if (node) {
      if (node.dataset.uuid in rowsOnScreen) {
        contacts.List.refresh(node.dataset.uuid);
      }
    }
  };
  function updateSelectCount(count) {
    HeaderUI.updateSelectCountTitle(count);
  }

  // Given a UUID we will call the callback function
  // if the contact's row get displayed on the screen
  // or is already on the screen. The callback will
  // receive the row displayed on the screen.
  // This method was created with testing purposes, and
  // just tracks a single row, not multiple ones.
  var notifyRowOnScreenByUUID = function notifyRowOnScreenByUUID(uuid,
     callback) {
    if (typeof callback !== 'function' || !uuid) {
      return;
    }

    if (rowsOnScreen[uuid]) {
      // Get the first group that is not favourites
      var groups = Object.keys(rowsOnScreen[uuid]);
      var group = groups.length > 1 ? groups[1] : groups[0];
      callback(rowsOnScreen[uuid][group]);
      _clearNotifyRowOnScreenByUUID();
      return;
    }

    _notifyRowOnScreenCallback = callback;
    _notifyRowOnScreenUUID = uuid;
  };

  function _clearNotifyRowOnScreenByUUID() {
    _notifyRowOnScreenCallback = null;
    _notifyRowOnScreenUUID = null;
  }

  // After merging one or more contacts, we need to remove all the matches
  // except the master one from the contacts list.
  function onContactsMerged(ids) {
    Object.keys(ids).forEach(id => {
      if (id in selectedContacts) {
        remove(id);
      }
    });
    Cache.evict(false /* undo applied cache */,
                true /* instant eviction */);
  }

  window.onmessage = (e) => {
    if (e.data.type != 'duplicate_contacts_merged' || !e.data.data) {
      return;
    }
    onContactsMerged(e.data.data);
  };

  /**
   * Cache related functionality.
   */

  function getFirstChunkCache() {
    // Get a representation of each group holding the first chunk of contacts
    // as objects of this form:
    // {
    //   elementName: <string>,
    //   attributes: <Array>,
    //   innerHTML: <string>
    // }

    var cache = [];

    var groups = Array.prototype.slice.call(groupsList.children);
    var contactsCount = CHUNK_SIZE;
    var lastOrderString;
    while (contactsCount && groups.length) {
      var group = groups.shift();

      var groupCache = {};
      groupCache.elementName = 'section';
      groupCache.attributes = [];
      for (var j = 0; j < group.attributes.length; j++) {
        groupCache.attributes.push({
          name: group.attributes[j].nodeName,
          value: group.attributes[j].value
        });
      }

      var section = document.createElement('section');
      var header = group.querySelector('header');
      // ICE group section has no header, only <ol> child
      if (header) {
        section.appendChild(header.cloneNode(true));
      }

      // We only want complete contacts until we reach CHUNK_SIZE
      var ol = group.querySelector('ol');
      var contacts = ol.cloneNode();
      [].forEach.call(ol.querySelectorAll('li.contact-item'), (node) => {
        if (!contactsCount) {
          return;
        }
        contactsCount--;

        if (loadedContacts && loadedContacts[node.dataset.uuid]) {
          renderOrderString(node);
        }

        node.dataset.cache = true;
        var contact = node.cloneNode(true);

        // We cannot cache the contact image, so we get rid of them.
        var aside = contact.querySelector('aside');
        if (aside) {
          aside.parentNode.removeChild(aside);
        }

        contact.dataset.status = '';
        contact.dataset.rendered = false;
        contact.dataset.visited = false;

        lastOrderString = contact.dataset.order;

        contacts.appendChild(contact);
      });
      section.appendChild(contacts);

      groupCache.innerHTML = section.innerHTML;
      section = null;
      cache.push(groupCache);
    }

    return {
      cache: cache,
      lastOrderString: lastOrderString
    };
  }

  var cacheRequestTimer;
  function cacheContactsList() {
    if (inSelectMode) {
      return;
    }
    // The Cache mechanism accesses localStorage.
    // Use the following logic to cache the contact list in a
    // moderate pattern.
    // 1. When a request to cache the list is received, start a
    //    timer.
    // 2. If another request is received while the timer is
    //    running, reset it.
    // 3. Once the timer fires, start caching the list.

    if (cacheRequestTimer) {
      clearTimeout(cacheRequestTimer);
    }

    cacheRequestTimer = setTimeout(() => {
      cacheRequestTimer = null;
      Cache.firstChunk = getFirstChunkCache();
      // Release memory taken by the old cache.
      Cache.cleanup();
    }, 1000);
  }

  function removeCachedContactFromList(id) {
    remove(id);
    // We may also need to remove it from the list of ICE contacts.
    ICEData.load().then((contacts) => {
      for (var i = 0; i < contacts.length; i++) {
        if (contacts[i].id == id) {
          ICEData.removeICEContact(contacts[i].id);
        }
      }
    });
    // We also remove it from the cache
    Cache.removeContact(id);
  }

  function verifyAndRebuildCache() {
    if (!Cache.active || !Cache.length) {
      // Everything is fine.
      cacheContactsList();
      return;
    }

    // If there are still contacts to consume in the cache it
    // means that these contacts are no longer part of the contacts
    // source, but they are still in the DOM, so we need to eliminate them.
    // This can happen if the contacts were removed while the app
    // was closed for instance.
    for (var id of Cache.contacts) {
      removeCachedContactFromList(id);
      // If the contact is also cached as a favorite contact, we don't need to
      // try to remove it again from the DOM when processing the pending
      // favorites. So we simply remove them from the cache (getting the
      // contact does the deletion from the cache).
      if (Cache.hasFavorite(id)) {
        Cache.getFavorite(id);
      }
    }

    // It is possible that we have favorite contacts that are in the favorites
    // group (which is cached for being the first group) but are also outside
    // of the first chunk. In that case, we remove them from the favorites
    // group.
    for (var favId of Cache.favorites) {
      removeCachedContactFromList(favId);
    }

    // Once we cleaned up the DOM, we can create the cache again.
    cacheContactsList();
  }

  function onCacheEvicted() {
    cacheContactsList();
  }

  /**
   * API
   */
  return {
    'init': init,
    'load': load,
    'refresh': refresh,
    'refreshFb': refreshFb,
    'getAllContacts': getAllContacts,
    'handleClick': handleClick,
    'hide': hide,
    'show': show,
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
    'exitSelectMode': exitSelectMode,
    get chunkSize() {
      return CHUNK_SIZE;
    },
    /*
     * Returns the number of contacts loaded in the list
     */
    get total() {
      return Object.keys(selectedContacts).length;
    },
    get isSelecting() {
      return inSelectMode;
    },
    'notifyRowOnScreenByUUID': notifyRowOnScreenByUUID,
    'toggleICEGroup': toggleICEGroup,
    // For testing purposes only
    set ICELoaded(loaded) {
      ICELoaded = loaded;
    },
    'loadVisibilityMonitor': loadVisibilityMonitor
  };
})();
