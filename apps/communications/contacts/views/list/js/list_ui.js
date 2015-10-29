/* globals ListUtils, Cache, Search, HeaderUI, ActivityHandler,
ContactsService, utils, Normalizer, LazyLoader, Loader, SelectMode, ICEStore,
ICEData, ICEView, ImageLoader, ContactPhotoHelper, ConfirmDialog,
monitorTagVisibility */

(function(exports){
  'use strict';

  var _,
      groupsList,
      loaded = false,
      cancel,
      contactsListView,
      fastScroll,
      scrollable,
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
      photosById = {},
      search = null,
      searchInput = null,
      // Dictionary by contact id with the rows on screen
      rowsOnScreen = {},
      _notifyRowOnScreenCallback = null,
      _notifyRowOnScreenUUID = null,
      // Will keep an array of contacts ids, not higger than
      // 2 contacts with current implementation
      iceContacts = [],
      iceGroup = null,
      iceState = null,
      forceICEGroupToBeHidden = false,
      clonableSelectCheck = null,
      _action = null;

  // Possible values for the configuration field 'defaultContactsOrder'
  // config.json file (see bug 841693)
  var ORDER_BY_FAMILY_NAME = 'familyName';

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

  function onscreen(row) {
    var id = row.dataset.uuid;
    var group = row.dataset.group;
    if (!id || !group) {
      return;
    }

    rowsOnScreen[id] = rowsOnScreen[id] || {};
    rowsOnScreen[id][group] = row;

    monitor && monitor.pauseMonitoringMutations();
    renderLoadedContact(row, id);
    ListUtils.updateRowStyle(row, true);
    renderPhoto(row, id, false, group);
    ListUtils.updateSingleRowSelection(row, id);

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
  }

  function renderLoadedContact(el, id) {
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
  }

  function clearLoadedContact(el, id, group) {
    if (!el.dataset.rendered || !el.dataset.order || !el.dataset.search) {
      return;
    }

    id = id || el.dataset.uuid;
    group = group || el.dataset.group;
    if (loadedContacts[id]) {
      loadedContacts[id][group] = null;
    }
  }

  function offscreen(row) {
    var id = row.dataset.uuid;
    var group = row.dataset.group;
    if (!id || !group) {
      return;
    }

    if (rowsOnScreen[id]) {
      delete rowsOnScreen[id][group];
    }

    monitor && monitor.pauseMonitoringMutations();
    ListUtils.updateRowStyle(row, false);
    if (!Search || !Search.isInSearchMode()) {
      releasePhoto(row);
    }
    monitor && monitor.resumeMonitoringMutations(false);
  }

  function init(action, reset) {
    _ = navigator.mozL10n.get;
    cancel = document.getElementById('cancel-search');
    contactsListView = document.getElementById('view-contacts-list');
    fastScroll = document.querySelector('nav[data-type="scrollbar"]');
    scrollable = document.querySelector('#groups-container');
    noContacts = document.querySelector('#no-contacts');
    search = document.querySelector('#search-start');
    searchInput = document.querySelector('#search-start > input');

    groupsList = document.getElementById('groups-list');

    if (action) {
      _action = action;
      toggleICEGroup(false);
    }

    addListeners();

    initConfiguration();

    // Test code calls init() directly, so we may have to reset.
    if (reset) {
      resetDom();
    }

     window.addEventListener('list-shown', function() {
      if (!loading) {
        return;
      }

      ContactsService.resume(function isRendered(contact) {
        return !!loadedContacts[contact.id];
      });
    });

    createPhotoTemplate();

    Cache.oneviction = onCacheEvicted;

    getAllContacts(function() {
      console.error('Error retrieving contacts');
    });

    initAlphaScroll();
    ActivityHandler.isCancelable().then(isCancelable => {
      HeaderUI.updateHeader(isCancelable);
    });
  }

  function checkContactChanges() {
    var changesStringified = sessionStorage.getItem('contactChanges');
    sessionStorage.setItem('contactChanges', null);
    if (!changesStringified ||
        changesStringified === 'null') {
      return;
    }
    var changes = JSON.parse(changesStringified);
    if (!changes || !changes[0] || !changes[0].reason) {
      return;
    }

    oncontactchange(changes[0]);
  }

  function checkOrderChange() {
    var orderChange = sessionStorage.getItem('orderchange');

    // Update list if neeeded
    if (orderChange && orderChange !== 'null') {
      setOrderByLastName(!orderByLastName);
      load(null, true);
      sessionStorage.setItem('orderchange', null);
    }
  }

  function addListeners() {
    search.addEventListener('click', enterSearchMode);
    searchInput.addEventListener('focus', enterSearchMode);
    groupsList.addEventListener('click', onClickHandler);
    ContactsService.addListener('contactchange', oncontactchange);

    window.addEventListener('exitSelectMode', function() {
      restoreICEGroupState();
    });

    window.addEventListener('pageshow', function() {
      window.dispatchEvent(new CustomEvent('list-shown'));
      checkContactChanges();
      checkOrderChange();
    });
  }

  var pendingChanges = {};

  // This function is called when we finish a oncontactchange operation to
  // remove the op of the pending changes and check if we need to apply more
  // changes request over the same id.
  function checkPendingChanges(id) {
    var changes = pendingChanges[id];
    if (!changes) {
      return;
    }

    pendingChanges[id].shift();

    if (pendingChanges[id].length >= 1) {
      performOnContactChange(pendingChanges[id][0]);
    }
  }

  function oncontactchange(event) {
    if (typeof pendingChanges[event.contactID] !== 'undefined') {
      pendingChanges[event.contactID].push({
        contactID: event.contactID,
        reason: event.reason
      });
    } else {
      pendingChanges[event.contactID] = [{
        contactID: event.contactID,
        reason: event.reason
      }];
    }

    // If there is already a pending request, don't do anything,
    // just wait to finish it in order
    if (pendingChanges[event.contactID].length > 1) {
      return;
    }

    performOnContactChange(event);
  }

  function performOnContactChange(event) {
    // To be on the safe side for now we evict the cache everytime a
    // contact change event is received. In the future, we may want to check
    // if the change affects the cache or not, so we avoid evicting it when
    // is not needed.
    Cache.evict();
    switch (event.reason) {
      case 'update':
      case 'create':
        refreshContactInList(event.contactID);
        break;
      case 'remove':
        remove(event.contactID, event.reason);
        checkPendingChanges(event.contactID);
        notifyContactChanged(event.contactID, event.reason);
        break;
    }
  }

  // Refresh a contact in the list, and notifies of contact
  // changed to possible listeners.
  function refreshContactInList(id) {
    refresh(id, function() {
      notifyContactChanged(id);
      checkPendingChanges(id);
    });
  }

  // Send a custom event when we know that a contact changed and
  // the contact list was updated.
  // Used internally in places where the contact list is a reference
  function notifyContactChanged(id, reason) {
    document.dispatchEvent(new CustomEvent('contactChanged', {
      detail: {
        contactID: id,
        reason: reason
      }
    }));
  }

  function enterSearchMode(evt) {
    Loader.view('Search', function viewLoaded() {
      initSearch(function onInit() {
        Search.enterSearchMode(evt);
      });
    });
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
      ListUtils.updateRowStyle(node, true);
      ListUtils.updateSingleRowSelection(node, id);
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

  function initSearch(callback) {
    Search.init(searchSource, true, null);

    if (callback) {
      callback();
    }
  }

  function initAlphaScroll() {
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
  }

  function scrollToCb(domTarget, group) {
    if (domTarget.offsetTop > 0) {
      scrollable.scrollTop = domTarget.offsetTop;
    } else if (group === 'search-container') {
      scrollable.scrollTop = 0;
    }
  }

  function load(contacts, forceReset, callback) {
    var onError = function() {
      console.log('ERROR Retrieving contacts');
    };

    if (forceReset) {
      needImgLoaderReload = true;
    }

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
  function initConfiguration(callback) {
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
  }

  function renderGroupHeader(group, letter) {
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
  }

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
  function renderContact(contact, container) {
    container = container || createPlaceholder(contact);
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
  }

  /*
    In charge of providing the dom structure to create a checkbox
    for each contact row, creates it and clone a copy of a generated
    template.
  */
  function getSelectCheck(uuid) {
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
  }

  /*
    Generates the dom structure for the selectable check:

    <label class="pack-checkbox">
      <input type="checkbox" name="selectIds[]" value="#uid#"></input>
      <span></span>
    </label>
  */
  function buildSelectCheck() {
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
  }

  // "Render" search string into node's data-search attribute.  If the
  // contact is not already known, try to look it up in our cache of loaded
  // contacts.  This is used to defer the computation of the search string
  // since profiling has shown it to be expensive.
  function renderSearchString(node, contact) {
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
  }

  function renderOrderString(node, contact) {
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
  }

  // Create a mostly empty list item as a placeholder for the contact.  All
  // visibile DOM elements will be rendered later via the visibility monitor.
  // This function ensures that necessary meta data is defined in the node
  // dataset.
  function createPlaceholder(contact, group) {
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
  }

  function getStringValue(contact, field) {
    if (contact[field] && contact[field][0]) {
      return String(contact[field][0]).trim();
    }

    return null;
  }

  function getSearchString(contact, display) {
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
  }

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

  const CHUNK_SIZE = 20;
  function loadChunk(chunk) {
    var nodes = [];
    for (var i = 0, n = chunk.length; i < n; ++i) {

      var newNodes = appendToLists(chunk[i]);
      nodes.push.apply(nodes, newNodes);
    }

    // If the search view has been activated by the user, then send newly
    // loaded contacts over to populate any in-progress search.  Nothing
    // to do if search is not actived.
    if (Search && Search.appendNodes) {
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

    SelectMode.selectedContacts[contact.id] = SelectMode.selectAllPending;

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
      var separator =
        '<p class="contact-text"><span class="icon-social';
      cachedContact = cachedContact.split(separator)[0];

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
  function onListRendered() {
    // We cancel any pending intent of selection
    // Now any new contact added to the list will
    // be selected just if we clicked on select all
    // and we didn't unselected any other contact
    SelectMode.selectAllPending = false;

    loadVisibilityMonitor();

    // Replacing old message 'startup-path-done'
    utils.PerformanceHelper.loadEnd();
    LazyLoader.load(['/shared/js/contacts/utilities/image_loader.js'], () => {
      lazyLoadImages();
      loaded = true;
    });

    loadICE().then(() => {
      if (Cache.enabled) {
        // Once we've rendered the whole list, we can check if what we added
        // in the cached chunk is valid.
        verifyAndRebuildCache();
      }
    });
  }

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

    iceState = !iceGroup.classList.contains('hide');
    forceICEGroupToBeHidden = !(!!show);
    forceICEGroupToBeHidden ? hideICEGroup() : showICEGroup();
  }

  function restoreICEGroupState() {
    if (!iceState) {
      // ICE hasn't been loaded yet so let's force to load it again
      loadICE();
    } else {
      iceState ? showICEGroup() : hideICEGroup();
    }

    // Clear flag
    iceState = null;
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
      LazyLoader.load(['/shared/js/contacts/utilities/image_loader.js',
        '/contacts/js/views/ice.js',
        document.getElementById('ice-view'),
        '/contacts/views/list/js/main_navigation.js'], () => {
        // Prebuild the rows here, we have all the data to
        // build them. Current amount of rows is 2.
        function rowBuilder(id, node) {
          renderLoadedContact(node, id);
          ListUtils.updateRowStyle(node, true);
          ListUtils.updateSingleRowSelection(node, id);
          var out = node.cloneNode(true);
          renderPhoto(out, id, true, out.dataset.group);
          return out;
        }
        ICEView.init(iceContacts, rowBuilder, onClickHandler);
        ICEView.showICEList();
      });
    });
  }

  function onClickHandler(evt) {
    var target = evt.target;
    var dataset = target.dataset || {};
    var parentDataset = target.parentNode ?
                          (target.parentNode.dataset || {}) : {};
    var uuid = dataset.uuid || parentDataset.uuid;
    var eventName = 'itemClicked';
    if (uuid) {
      if (_action) {
        if (_action === 'pick') {
          eventName = 'pickAction';
        } else if (_action === 'update') {
          selectList(uuid);
          return;
        }
      }

      if (SelectMode.isInSelectMode) {
        SelectMode.onContactClicked(uuid);
        return;
      }

      window.dispatchEvent(new CustomEvent(eventName, {
        'detail': {
          'uuid': uuid
        }
      }));
    }

    evt.preventDefault();
  }

  function isFavorite(contact) {
    return contact.category && contact.category.indexOf('favorite') != -1;
  }

  function lazyLoadImages() {
    LazyLoader.load(['/shared/js/contacts/utilities/image_loader.js'],
      function() {
      if (!imgLoader) {
        imgLoader = new ImageLoader('#groups-container',
                                    'li:not([data-group="ice"])');
      }
      imgLoader.reload();
    });
  }

  function dispatchCustomEvent(eventName) {
    var event = new CustomEvent(eventName);
    window.dispatchEvent(event);
  }

  // Update photo reference cache for given contact. This is used to render
  // the photo when a contact row is on screen after we've thrown away the
  // full contact object.
  function updatePhoto(contact, id) {
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
  }

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
  function renderPhoto(link, id, asClone, group) {
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
      // Update only if we are reusing the row for a different user, or
      // the image has been collected
      if (link.dataset.uuid !== id || !link.dataset.src) {
        delete img.dataset.group;
        img.style.backgroundPosition = img.dataset.backgroundPosition || '';
        setImageURL(img, photo, asClone);  
      }
      
      return;
    }

    var figure = photoTemplate.cloneNode(true);
    img = figure.children[0];
    setImageURL(img, photo);

    link.insertBefore(figure, link.children[0]);
    return;
  }

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

  }

  // Remove the image for the given list item.  Leave the photo in our cache,
  // however, so the image can be reloaded later.
  function releasePhoto(el) {
    // If the imgLoader isn't ready yet, we should have nothing to release
    if (!imgLoader) {
      return;
    }

    var img = imgLoader.releaseImage(el);
    if (!img) {
      return;
    }

    setImageURL(img, null);
  }

  function renderOrg(contact, link, add) {
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
  }

  function addOrgMarkup(link, content) {
    var bdi = document.createElement('bdi');
    bdi.className = 'org ellipsis-dir-fix';
    if (content) {
      bdi.textContent = content;
    }
    var meta = document.createElement('p');
    meta.classList.add('contact-text');
    meta.appendChild(bdi);
    link.appendChild(meta);
    return meta;
  }

  function toggleNoContactsScreen(show) {
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
  }

  function showNoContactsAlert() {
    LazyLoader.load(['/shared/js/confirm.js',
          document.getElementById('confirmation-message')], function() {
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
    });
  }

  function getContactsByGroup(errorCb, contacts) {
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

    return Promise.resolve();
  }

  function getAllContacts(errorCb, successCb) {
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
  }

  function addToList(contact) {
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
    var selectAll = document.getElementById('select-all');
    SelectMode.selectedContacts[contact.id] = SelectMode.selectAllPending ||
      (selectAll && selectAll.disabled);
  }

  function hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  }

  // Fills the contact data to display if no givenName and familyName
  function getDisplayName(contact) {
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
  }

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

  function addToGroup(renderedNode, list) {
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
  }

  function hideGroup(group) {
    var groupTitle = getGroupList(group).parentNode.children[0];
    groupTitle.classList.add('hide');
  }

  function showGroupByList(current) {
    var groupTitle = current.parentNode.children[0];
    groupTitle.classList.remove('hide');
  }

  function remove(id) {
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

    if (SelectMode.selectedContacts[id] !== undefined) {
      delete SelectMode.selectedContacts[id];
    }
  }

  function getStringToBeOrdered(contact, display) {
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
  }

  // Utility function to quickly guess the group name for the given contact.
  // Since full name normalization is expensive, we use a stripped down
  // algorithm here that catches the majority of cases; i.e. name exists and
  // starts with a known letter.  If this is not the case, then return null
  // and force the caller to use the more expensive approach.
  function getFastGroupName(contact) {
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
  }

  function getGroupNameByOrderString(order) {
    var ret = order.charAt(0);  // order string is already forced to upper case
    if (!(ret in GROUP_ORDER)) {
      ret = 'und';
    }
    return ret;
  }

  // Perform contact refresh.  First arg may be either an ID or a contact
  // object.  If an ID is passed then the contact is retrieved from the
  // database.  Otherwise refresh the list based on the given contact
  // object without looking up any information.
  function refresh(idOrContact, callback) {
    // Passed a contact, not an ID
    if (typeof(idOrContact) !== 'string') {
      refreshContact(idOrContact, null, callback);
      return;
    }

    // Passed an ID, so look up contact
    ContactsService.get(idOrContact, function(contact) {
      refreshContact(contact, callback);
    });
  }

  function refreshContact(contact, callback) {
    remove(contact.id);
    addToList(contact);
    if (Search) {
      Search.updateSearchList(function() {
        if (callback) {
          callback(contact.id);
        }
      });
    } else if (callback) {
      callback(contact.id);
    }
  }

  // Reset the content of the list to 0
  function resetDom(cb) {
    if (loading) {
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
  }

  function setOrderByLastName(value) {
    var newOrder = value;
    if (typeof value === 'string') {
      newOrder = value === 'true' ? true : false;
    }
    orderByLastName = newOrder;
  }

  function selectList(uuid) {
    HeaderUI.hideAddButton();
    window.dispatchEvent(new CustomEvent('updateAction', {
      'detail': {
        'uuid': uuid
      }
    }));
  }

  // Given a UUID we will call the callback function
  // if the contact's row get displayed on the screen
  // or is already on the screen. The callback will
  // receive the row displayed on the screen.
  // This method was created with testing purposes, and
  // just tracks a single row, not multiple ones.
  function notifyRowOnScreenByUUID(uuid, callback) {
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
  }

  function _clearNotifyRowOnScreenByUUID() {
    _notifyRowOnScreenCallback = null;
    _notifyRowOnScreenUUID = null;
  }

  // After merging one or more contacts, we need to remove all the matches
  // except the master one from the contacts list.
  function onContactsMerged(ids) {
    Object.keys(ids).forEach(id => {
      if (id in SelectMode.selectedContacts) {
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

      /* eslint-disable */
      groupCache.innerHTML = section.innerHTML;
      /* eslint-enable */
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
    if (SelectMode.isInSelectMode) {
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

  exports.ListUI = {
    'init': init,
    get chunkSize() {
      return CHUNK_SIZE;
    },
    /*
     * Returns the number of contacts loaded in the list
     */
    get total() {
      return Object.keys(SelectMode.selectedContacts).length;
    },
    get rowsOnScreen() {
      return rowsOnScreen;
    },
    // Testing purpose
    'notifyRowOnScreenByUUID': notifyRowOnScreenByUUID,
    'refresh': refresh
  };

  /* Tell the audio channel manager that we want to adjust the "notification"
   * channel when the user presses the volumeup/volumedown buttons. */
  if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
  }
})(window);