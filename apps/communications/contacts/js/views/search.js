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
      contactData = null,
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
      // Limit search result to hardLimit contacts, recalc with page size
      hardLimit = 25,
      emptySearch = true,
      remainingPending = true,
      searchEnabled = false,
      source = null,
      navigationController = null,
      recyclist;

  // The _source argument should be an adapter object that provides access
  // to the contact data in the app.  This is done by defining the following
  // functions on the adapter object:
  //    getData()             Gets the search data.
  //    expectMoreData()      True if nodes will be added via appendNodes()
  //    clone(node)           Clone the given contact node
  //    getSearchText(node)   Get the search text from the given node
  //    click(event)          Click event handler to use
  var init = function load(_source, defaultEnabled, navigation) {
    var searchGroup = document.getElementById('groups-list-search');
    searchView = document.getElementById('search-view');
    searchList = document.getElementById('search-list');

    recyclist = new Recyclist({
      template: document.getElementById('search-item-template'),
      numItems: 0,
      populate: function(element, index) {
        element.textContent = 'Hello search' + index;
      },
      forget: function(element, index) {},
      scrollParent: searchGroup,
      scrollChild: searchList,
      getScrollHeight: function() {
        return searchGroup.clientHeight;
      },
      getScrollPos: function() {
        return searchGroup.scrollTop;
      }
    });
    recyclist.init();

    if (!_source)
      throw new Error('Search requires a contact source!');

    source = _source;

    if (typeof source.click === 'function')
      searchList.addEventListener('click', source.click);

    searchEnabled = !!defaultEnabled;

    navigationController = navigation ||
      (window.Contacts && Contacts.navigation);
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
      blurList = true;
    });
    searchNoResult = document.getElementById('no-result');
    searchProgress = document.getElementById('search-progress');

    searchBox.addEventListener('focus', function() {
      blurList = false;
    });

    // TODO: make facebook images work.
    // LazyLoader.load(['/contacts/js/fb_resolver.js']);
  };

  // Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    if (evt) {
      evt.preventDefault();
    }
    searchView.classList.remove('insearchmode');
    if (navigationController) {
      navigationController.back();
    }

    window.setTimeout(function exit_search() {
      hideProgressResults();

      searchBox.value = '';

      // Resetting state
      contactData = null;
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

  function fillIdentityResults() {
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
      if (navigationController) {
        navigationController.go('search-view', 'none');
      }

      setTimeout(function nextTick() {
        searchBox.focus();
      });
    }
  };

  function fillInitialSearchPage() {
    hideProgressResults();
    fillIdentityResults();
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
    var c = from;
    for (; c < end && c < contacts.length; c++) {
      var contact = contacts[c];
      var contactText = source.getSearchText(contacts[c]);
      if (!pattern.test(contactText)) {
        if (contact.id in currentSet) {
          delete currentSet[contact.id];
        }
      } else {
        if (state.count === 0) {
          hideProgressResults();
        }
        // Only an initial page of elements is loaded in the search list
        if (!(contact.id in currentSet)) {
          currentSet[contact.id] = contact;
        }

        state.searchables.push({
          node: contact,
          text: contactText
        });
        state.count++;
      }
    }
    recyclist.addItems(c - from);
    recyclist.fix();

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
    } else if (source.expectMoreData()) {
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
      searchableNodes = state.searchables;
      canReuseSearchables = true;
      // If the user wished to scroll let's add the remaining results
      if (blurList === true) {
        searchTimer = window.setTimeout(function() {
          searchTimer = null;
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
    if (!nodes || !nodes.length || !contactData)
      return;

    contactData.push.apply(contactData, nodes);

    // If there are no searches in progress, then we are done
    if (!currentTextToSearch || !canReuseSearchables || !searchableNodes)
      return;

    // If we have a current search then we need to determine whether the
    // new nodes should show up in that search.
    var pattern = new RegExp(currentTextToSearch, 'i');
    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i];
      var nodeText = source.getSearchText(node);
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

  var getContactsData = function contactsDom() {
    if (!contactData) {
      contactData = source.getData();
    }
    return contactData;
  };

  var getContactsToSearch = function getContactsToSearch(newText, prevText) {
    var out;
    if (canReuseSearchables && newText.length > prevText.length &&
        prevText.length > 0 && newText.indexOf(prevText) === 0) {
      out = searchableNodes || getContactsData();
    } else {
      utils.dom.removeChildNodes(searchList);
      currentSet = {};
      out = getContactsData();
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
    contactData = null;
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
