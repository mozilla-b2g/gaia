'use strict';

var contacts = window.contacts || {};

contacts.Search = (function() {
  var inSearchMode = false,
      searchView,
      searchBox,
      searchList,
      searchNoResult,
      searchProgress,
      searchTimer = null,
      contactNodes = null,
      // On the steady state holds the list result of the current search
      searchableNodes = null,
      currentTextToSearch = '',
      prevTextToSearch = '',
      // Pointer to the nodes which are currently on the result list
      currentSet = {},
      searchTextCache = {},
      canReuseSearchables = false,
      blurList = false,
      theClones = {},
      CHUNK_SIZE = 10,
      // Default to invalid page size and recalculate when first row added
      searchPageSize = -1,
      // Limit search result to hardLimit contacts, recalc with page size
      hardLimit = 25,
      emptySearch = true,
      remainingPending = true,
      imgLoader,
      searchEnabled = false,
      source = null;

  // The _source argument should be an adapter object that provides access
  // to the contact nodes in the app.  This is done by defining the following
  // functions on the adapter object:
  //    getNodes()            An Array of all contact DOM nodes
  //    getFirstNode()        First contact DOM node
  //    getNextNode(node)     Given a node, find the next node
  //    expectMoreNodes()     True if nodes will be added via appendNodes()
  //    clone(node)           Clone the given contact node
  //    getNodeById(id)       Get the node matching the given ID, or null
  //    getSearchText(node)   Get the search text from the given node
  //    click(event)          Click event handler to use
  var init = function load(_source, defaultEnabled) {

    searchView = document.getElementById('search-view');
    searchList = document.getElementById('search-list');

    if (!_source)
      throw new Error('Search requires a contact source!');

    source = _source;

    if (typeof source.click === 'function')
      searchList.addEventListener('click', source.click);

    searchEnabled = !!defaultEnabled;
  };

  var initialized = false;

  var ignoreReturnKey = function ignoreReturnKey(evt) {
    if (evt.keyCode == 13) { // VK_Return
      evt.preventDefault();
    }
  };

  var doInit = function doInit() {
    if (initialized) {
      return;
    }

    utils.listeners.add({
      '#cancel-search': exitSearchMode,
      '#search-contact': [
        {
          event: 'keypress',
          handler: ignoreReturnKey
        }
      ]
    });

    initialized = true;
    searchBox = document.getElementById('search-contact');
    var resetButton = searchBox.nextElementSibling;
    resetButton.addEventListener('ontouchstart' in window ? 'touchstart' :
                                 'mousedown', function() {
      searchBox.value = '';
      searchBox.focus();
      resetState();
      window.setTimeout(fillInitialSearchPage, 0);
    });

    searchList.parentNode.addEventListener('touchstart', function() {
      if (searchableNodes && remainingPending) {
        addRemainingResults(searchableNodes, searchPageSize);
      }
      blurList = true;
    });
    searchNoResult = document.getElementById('no-result');
    searchProgress = document.getElementById('search-progress');
    searchBox.addEventListener('blur', function() {
      window.setTimeout(onSearchBlur, 0);
    });

    searchBox.addEventListener('focus', function() {
      blurList = false;
    });

    imgLoader = new ImageLoader('#groups-list-search', 'li');
    LazyLoader.load(['/contacts/js/fb_resolver.js'], function() {
      imgLoader.setResolver(fb.resolver);
    });
  };

  // Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    if (evt) {
      evt.preventDefault();
    }
    // There is an issue in Gecko related to repaint with APZ. The purpose of
    // this code is to force a repaint programmatically (see bug 972091)
    var viewContactsList = document.getElementById('view-contacts-list');
    viewContactsList && viewContactsList.classList.toggle('repaint');
    searchView.classList.remove('insearchmode');
    if (window.Contacts && Contacts.navigation) {
      Contacts.navigation.back();
    }

    window.setTimeout(function exit_search() {
      hideProgressResults();

      searchBox.value = '';

      // Resetting state
      contactNodes = null;
      searchTextCache = {};
      resetState();

      inSearchMode = false;
    }, 0);

    window.removeEventListener('input', onInput);
  };

  function resetState() {
    prevTextToSearch = '';
    currentTextToSearch = '';
    searchableNodes = null;
    canReuseSearchables = false;
    currentSet = {};
    // We don't know if the user will launch a new search later
    theClones = {};
    utils.dom.removeChildNodes(searchList);
    emptySearch = true;
    remainingPending = true;
  }

  function addRemainingResults(nodes, from) {
    if (remainingPending !== true) {
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var i = from; i < hardLimit && i < nodes.length; i++) {
      var node = nodes[i].node;
      var clon = getClone(node);
      fragment.appendChild(clon);
      currentSet[node.dataset.uuid] = clon;
    }

    if (fragment.hasChildNodes()) {
      searchList.appendChild(fragment);
      imgLoader.reload();
    }

    remainingPending = false;
  }

  function onSearchBlur(e) {
    if (canReuseSearchables && searchableNodes &&
        searchView.classList.contains('insearchmode') && blurList) {
      // All the searchable nodes have to be added
      addRemainingResults(searchableNodes, searchPageSize);
    }
    else if (emptySearch === true && remainingPending === true) {
      var lastNode = searchList.querySelector('li:last-child');
      if (lastNode) {
        var lastNodeUid = lastNode.dataset.uuid;
        var startNode = source.getNextNode(source.getNodeById(lastNodeUid));
        fillIdentityResults(startNode, hardLimit - searchPageSize);
        remainingPending = false;

        imgLoader.reload();
      }
    }
  }

  function fillIdentityResults(startNode, number) {
    var fragment = document.createDocumentFragment();

    var contact = startNode;
    for (var i = 0; i < number && contact; i++) {
      var clonedNode = getClone(contact);
      fragment.appendChild(clonedNode);
      currentSet[contact.dataset.uuid] = clonedNode;
      contact = source.getNextNode(contact);
    }

    if (fragment.hasChildNodes()) {
      searchList.appendChild(fragment);
    }
  }

  function getClone(node) {
    var id = node.dataset.uuid;
    var out = theClones[id];

    if (!out) {
      out = source.clone(node);
      cacheClone(id, out);
    }

    return out;
  }

  function cacheClone(id, clone) {
    theClones[id] = clone;
  }

  function onInput(e) {
    if (e.target.id === searchBox.id) {
      search();
    }
  }

  var enterSearchMode = function searchMode(evt) {
    evt.preventDefault();

    if (!inSearchMode) {
      window.addEventListener('input', onInput);
      searchView.classList.add('insearchmode');
      doInit();
      fillInitialSearchPage();
      inSearchMode = true;
      emptySearch = true;
      if (window.Contacts && Contacts.navigation) {
        Contacts.navigation.go('search-view', 'none');
      }

      setTimeout(function nextTick() {
        searchBox.focus();
      });
    }
  };

  function fillInitialSearchPage() {
    hideProgressResults();

    var startContact = source.getFirstNode();
    var numToFill = searchPageSize;

    // Calculate rows visible on a single page the first time we get a row
    // that we can measure.
    if (startContact && searchPageSize < 1) {
      fillIdentityResults(startContact, 1);

      var viewHeight = searchList.getBoundingClientRect().height;
      var rowHeight = searchList.children[0].getBoundingClientRect().height;
      searchPageSize = Math.ceil(viewHeight / rowHeight);
      hardLimit = ~~(3.5 * searchPageSize);

      startContact = source.getNextNode(startContact);
      numToFill = searchPageSize - 1;
    }

    fillIdentityResults(startContact, numToFill);

    imgLoader.reload();
  }

  function doSearch(contacts, from, searchText, pattern, state) {
    // Check whether the user enter a new term or not
    if (currentTextToSearch.localeCompare(searchText) !== 0) {
      canReuseSearchables = false;
      window.console.warn('**** Cancelling current search ****');
      return;
    }

    // Search the next chunk of contacts
    var end = from + CHUNK_SIZE;
    for (var c = from; c < end && c < contacts.length; c++) {
      var contact = contacts[c].node || contacts[c];
      var contactText = contacts[c].text || getSearchText(contacts[c]);
      if (!pattern.test(contactText)) {
        if (contact.dataset.uuid in currentSet) {
          searchList.removeChild(currentSet[contact.dataset.uuid]);
          delete currentSet[contact.dataset.uuid];
        }
      } else {
        if (state.count === 0) {
          hideProgressResults();
        }
        // Only an initial page of elements is loaded in the search list
        if (Object.keys(currentSet).length < searchPageSize &&
            !(contact.dataset.uuid in currentSet)) {
          var clonedNode = getClone(contact);
          currentSet[contact.dataset.uuid] = clonedNode;
          searchList.appendChild(clonedNode);
        }

        state.searchables.push({
          node: contact,
          text: contactText
        });
        state.count++;
      }
    }

    // If we are still searching through the list, then schedule
    // the next batch of search comparisons.
    if (c < contacts.length) {
      searchTimer = window.setTimeout(function do_search() {
        searchTimer = null;
        doSearch(contacts, from + CHUNK_SIZE, searchText,
                 pattern, state);
      }, 0);
      return;

    // If we expect to get more nodes, for example if the source is
    // still loading, then delay finalizing the end of the search
    } else if (source.expectMoreNodes()) {
      // Since we're blocked waiting on more contacts to be provided,
      // use some delay here to avoid a tight spin loop.
      var delay = 250;
      searchTimer = window.setTimeout(function do_search() {
        doSearch(contacts, Math.min(end, contacts.length), searchText,
                 pattern, state);
      }, delay);
      return;

    // Or we are complete with no results found
    } else if (state.count === 0) {
      showNoResults();

      canReuseSearchables = false;

    // Or we are complete with results that might have images to render
    } else {
      imgLoader.reload();
      searchableNodes = state.searchables;
      canReuseSearchables = true;
      // If the user wished to scroll let's add the remaining results
      if (blurList === true) {
        searchTimer = window.setTimeout(function() {
          searchTimer = null;
          addRemainingResults(searchableNodes, searchPageSize);
        },0);
      }
    }

    if (typeof state.searchDoneCb === 'function') {
      state.searchDoneCb();
    }
  }

  var enableSearch = function enableSearch() {
    if (searchEnabled) {
      return;
    }

    searchEnabled = true;
    // We perform the search when all the info have been loaded and the
    // user wrote something in the entry field
    invalidateCache();
    search();
  };

  // Allow the main contacts list to asynchronously tell us about additional
  // nodes as they are loaded.
  var appendNodes = function appendNodes(nodes) {
    if (!nodes || !nodes.length || !contactNodes)
      return;

    contactNodes.push.apply(contactNodes, nodes);

    // If there are no searches in progress, then we are done
    if (!currentTextToSearch || !canReuseSearchables || !searchableNodes)
      return;

    // If we have a current search then we need to determine whether the
    // new nodes should show up in that search.
    var pattern = new RegExp(currentTextToSearch, 'i');
    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i];
      var nodeText = getSearchText(node);
      if (pattern.test(nodeText)) {
        searchableNodes.push({
          node: node,
          text: nodeText
        });
      }
    }
  };

  var search = function performSearch(searchDoneCb) {
    prevTextToSearch = currentTextToSearch;

    currentTextToSearch = Normalizer.toAscii(searchBox.value.trim());
    currentTextToSearch = Normalizer.escapeRegExp(currentTextToSearch);
    var thisSearchText = new String(currentTextToSearch);

    if (thisSearchText.length === 0) {
      resetState();
      window.setTimeout(fillInitialSearchPage, 0);
    }
    else {
      showProgress();
      if (!searchEnabled) {
        resetState();
        return;
      }
      emptySearch = false;
      // The remaining results have not been added yet
      remainingPending = true;
      var pattern = new RegExp(thisSearchText, 'i');
      var contactsToSearch = getContactsToSearch(thisSearchText,
                                               prevTextToSearch);
      var state = {
        count: 0,
        searchables: [],
        searchDoneCb: searchDoneCb
      };
      searchTimer = window.setTimeout(function do_search() {
        searchTimer = null;
        doSearch(contactsToSearch, 0, thisSearchText, pattern, state);
      },0);
    }
  };

  function getSearchText(contact) {
    var out = '';

    var uuid = contact.dataset.uuid;
    if (uuid) {
      out = searchTextCache[uuid];
      if (!out) {
        out = source.getSearchText(contact);
        searchTextCache[uuid] = out;
      }
    }
    else {
      window.console.error('Search: Not uuid found for the provided node');
    }

    return out;
  }

  var getContactsDom = function contactsDom() {
    if (!contactNodes) {
      contactNodes = source.getNodes();
    }
    return contactNodes;
  };

  var getContactsToSearch = function getContactsToSearch(newText, prevText) {
    var out;
    if (canReuseSearchables && newText.length > prevText.length &&
        prevText.length > 0 && newText.indexOf(prevText) === 0) {
      out = searchableNodes || getContactsDom();
    } else {
      utils.dom.removeChildNodes(searchList);
      currentSet = {};
      out = getContactsDom();
      canReuseSearchables = false;
    }

    return out;
  };

  var isInSearchMode = function isInSearchMode() {
    return inSearchMode;
  };

  var invalidateCache = function s_invalidate() {
    if (searchTimer) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }
    currentTextToSearch = '';
    canReuseSearchables = false;
    searchableNodes = null;
    contactNodes = null;
    currentSet = {};
    searchTextCache = {};
  };

  var removeContact = function s_removeContact(id) {
    var contact = searchList.querySelector('li[data-uuid=\"' + id + '\"]');
    searchList.removeChild(contact);
  };

  var selectRow = function s_selectRow(id, value) {
    var check = searchList.querySelector(
      '#search-view input[value="' + id + '"]');
    if (check) {
      check.checked = value;
    }
  };

  function showProgress() {
    searchNoResult.classList.add('hide');
    searchProgress.classList.remove('hidden');
  }

  function showNoResults() {
    searchNoResult.classList.remove('hide');
    searchProgress.classList.add('hidden');
  }

  function hideProgressResults() {
    searchNoResult.classList.add('hide');
    searchProgress.classList.add('hidden');
  }

  return {
    'init': init,
    'invalidateCache': invalidateCache,
    'appendNodes': appendNodes,
    'removeContact': removeContact,
    'search': search,
    'enterSearchMode': enterSearchMode,
    'exitSearchMode': exitSearchMode,
    'isInSearchMode': isInSearchMode,
    'enableSearch': enableSearch,
    'selectRow': selectRow
  };
})();
