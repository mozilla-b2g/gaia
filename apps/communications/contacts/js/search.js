'use strict';

var contacts = window.contacts || {};

contacts.Search = (function() {
  var favoriteGroup,
      inSearchMode = false,
      conctactsListView,
      searchView,
      CONTACTS_SELECTOR = ".contact-item:not([data-uuid='#id#'])," +
                              ".block-item:not([data-uuid='#uid#'])",
      list,
      searchBox,
      searchList,
      searchNoResult,
      searchProgress,
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
      // These values might change for other form factors
      SEARCH_PAGE_SIZE = 7,
      // Search result will not be showing more than HARD_LIMIT contacts
      HARD_LIMIT = 25,
      emptySearch = true,
      remainingPending = true,
      imgLoader,
      searchEnabled = false;

  var init = function load(_conctactsListView, _groupFavorites, _clickHandler,
                           defaultEnabled) {
    conctactsListView = _conctactsListView;

    searchView = document.getElementById('search-view');

    favoriteGroup = _groupFavorites;
    searchBox = document.getElementById('search-contact');
    var resetButton = searchBox.nextElementSibling;
    resetButton.addEventListener('mousedown', function() {
      searchBox.value = '';
      searchBox.focus();
      resetState();
      window.setTimeout(fillInitialSearchPage, 0);
    });

    searchList = document.getElementById('search-list');
    if (typeof _clickHandler === 'function') {
      searchList.addEventListener('click', _clickHandler);
    }
    searchList.parentNode.addEventListener('touchstart', function() {
      blurList = true;
    });
    searchNoResult = document.getElementById('no-result');
    searchProgress = document.getElementById('search-progress');
    list = document.getElementById('groups-list');
    searchBox.addEventListener('blur', function() {
      window.setTimeout(onSearchBlur, 0);
    });

    searchBox.addEventListener('focus', function() {
      blurList = false;
    });

    imgLoader = new ImageLoader('#groups-list-search', 'li');

    if (defaultEnabled)
      searchEnabled = true;
  };

  //Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    evt.preventDefault();
    searchView.classList.remove('insearchmode');

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

    for (var i = from; i < HARD_LIMIT && i < nodes.length; i++) {
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
      addRemainingResults(searchableNodes, SEARCH_PAGE_SIZE);
    }
    else if (emptySearch === true && remainingPending === true) {
      var lastNode = searchList.querySelector('li:last-child');
      if (lastNode) {
        var lastNodeUid = lastNode.dataset.uuid;
        var startNode = getNextContactNode(conctactsListView.querySelector
                            ('[data-uuid="' + lastNodeUid + '"]'));
        fillIdentityResults(startNode, HARD_LIMIT - SEARCH_PAGE_SIZE);
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
      contact = getNextContactNode(contact);
    }

    if (fragment.hasChildNodes()) {
      searchList.appendChild(fragment);
    }
  }

  // Traverses the contact list trying to find the next node
  // Avoids a querySelectorAll which would cause performance problems
  function getNextContactNode(contact) {
    var out = contact.nextElementSibling;
    var nextParent = contact.parentNode.parentNode.nextElementSibling;

    while (!out && nextParent) {
      out = nextParent.querySelector('ol > li:first-child');
      nextParent = nextParent.nextElementSibling;
    }

    return out;
  }

  function getClone(node) {
    var id = node.dataset.uuid;
    var out = theClones[id];

    if (!out) {
      out = node.cloneNode();
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
      fillInitialSearchPage();
      inSearchMode = true;
      emptySearch = true;

      setTimeout(function nextTick() {
        searchBox.focus();
      });
    }
  };

  function fillInitialSearchPage() {
    hideProgressResults();

    var firstContact = conctactsListView.querySelector(CONTACTS_SELECTOR);
    fillIdentityResults(firstContact, SEARCH_PAGE_SIZE);

    imgLoader.reload();
  }

  function doSearch(contacts, from, searchText, pattern, state) {
    var end = from + CHUNK_SIZE;
    // Check whether the user enter a new term or not
    if (currentTextToSearch.localeCompare(searchText) === 0) {
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
          if (Object.keys(currentSet).length <
              SEARCH_PAGE_SIZE && !(contact.dataset.uuid in currentSet)) {
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
      if (c < contacts.length) {
        window.setTimeout(function do_search() {
          doSearch(contacts, from + CHUNK_SIZE, searchText,
                   pattern, state);
        }, 0);
      } else {
        if (state.count === 0) {
          showNoResults();

          canReuseSearchables = false;
        } else {
          imgLoader.reload();
          searchableNodes = state.searchables;
          canReuseSearchables = true;
          // If the user wished to scroll let's add the remaining results
          if (blurList === true) {
            window.setTimeout(function() {
              addRemainingResults(searchableNodes, SEARCH_PAGE_SIZE);
            },0);
          }
        }

        if (typeof state.searchDoneCb === 'function') {
          state.searchDoneCb();
        }
      }
    }
    else {
      canReuseSearchables = false;
      window.console.warn('**** Cancelling current search ****');
    }
  }

  var enableSearch = function enableSearch() {
    if (searchEnabled) {
      return;
    }
    searchEnabled = true;
    invalidateCache();
    search();
  };

  var search = function performSearch(searchDoneCb) {
    prevTextToSearch = currentTextToSearch;

    currentTextToSearch = utils.text.normalize(searchBox.value.trim());
    currentTextToSearch = utils.text.escapeRegExp(currentTextToSearch);
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
      window.setTimeout(function do_search() {
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
        var body = contact.querySelector('[data-search]');
        out = body ? body.dataset['search'] : contact.dataset['search'];
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
      contactNodes = list.querySelectorAll(CONTACTS_SELECTOR);
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
    'removeContact': removeContact,
    'search': search,
    'enterSearchMode': enterSearchMode,
    'exitSearchMode': exitSearchMode,
    'isInSearchMode': isInSearchMode,
    'enableSearch': enableSearch
  };
})();
