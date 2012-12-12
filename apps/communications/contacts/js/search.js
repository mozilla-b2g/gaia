'use strict';

var contacts = window.contacts || {};

contacts.Search = (function() {
  var favoriteGroup,
      inSearchMode = false,
      conctactsListView,
      list,
      searchBox,
      searchList,
      searchNoResult,
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
      imgLoader;

  var init = function load(_conctactsListView, _groupFavorites, _clickHandler) {
    conctactsListView = _conctactsListView;
    favoriteGroup = _groupFavorites;
    searchBox = document.getElementById('search-contact');
    searchList = document.getElementById('search-list');
    if (typeof _clickHandler === 'function') {
      searchList.addEventListener('click', _clickHandler);
    }
    searchList.parentNode.addEventListener('touchstart', function() {
      blurList = true;
    });
    searchNoResult = document.getElementById('no-result');
    list = document.getElementById('groups-list');
    searchBox.addEventListener('blur', function() {
      window.setTimeout(onSearchBlur, 0);
    });

    searchBox.addEventListener('focus', function() {
      blurList = false;
    });

    imgLoader = new ImageLoader('#search-list', 'li');
  }

  //Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    window.removeEventListener('input', onInput);

    if (evt) {
      evt.preventDefault();
    }
    window.setTimeout(function exit_search() {
      searchNoResult.classList.add('hide');
      conctactsListView.classList.remove('searching');
      conctactsListView.classList.remove('nonemptysearch');
      searchBox.value = '';
      inSearchMode = false;
      // Show elements that were hidden for the search
      if (favoriteGroup) {
        favoriteGroup.classList.remove('hide');
      }

      // Resetting state
      contactNodes = null;
      searchList.innerHTML = '';
      searchTextCache = {};
      resetState();
    },0);

    return false;
  };

  function resetState() {
    prevTextToSearch = '';
    currentTextToSearch = '';
    searchableNodes = null;
    canReuseSearchables = false;
    currentSet = {};
    // We don't know if the user will launch a new search later
    theClones = {};
    searchList.innerHTML = '';
  }

  function addRemainingResults(nodes,from) {
    for (var i = from; i < from + CHUNK_SIZE &&
                                    i < HARD_LIMIT && i < nodes.length; i++) {
      var node = nodes[i].node;
      var clon = getClone(node);
      searchList.appendChild(clon);
      currentSet[node.dataset.uuid] = clon;
    }

    if (i < HARD_LIMIT && i < nodes.length && blurList) {
      window.setTimeout(function add_remaining() {
        addRemainingResults(nodes, from + CHUNK_SIZE);
      },0);
    }

    imgLoader.reload();
  }

  function onSearchBlur(e) {
    if (canReuseSearchables && searchableNodes &&
        conctactsListView.classList.contains('nonemptysearch') && blurList) {
      // All the searchable nodes have to be added
      addRemainingResults(searchableNodes, SEARCH_PAGE_SIZE);
    }
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
    if(e.target.id === searchBox.id) {
      search();
    }
  }

  var enterSearchMode = function searchMode() {
    window.setTimeout(function enter_search() {
      if (!inSearchMode) {
        inSearchMode = true;
        conctactsListView.classList.add('searching');
        cleanContactsList();
        window.addEventListener('input', onInput);
      }
    }, 0);
    return false;
  };

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
            searchNoResult.classList.add('hide');
          }
          // Only an initial page of elements is loaded in the search list
          if (Object.keys(currentSet).length
             < SEARCH_PAGE_SIZE && !(contact.dataset.uuid in currentSet)) {
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
          searchNoResult.classList.remove('hide');
          canReuseSearchables = false;
        } else {
          document.dispatchEvent(new CustomEvent('onupdate'));
          imgLoader.reload();
          searchableNodes = state.searchables;
          canReuseSearchables = true;
        }

        if(typeof state.searchDoneCb === 'function') {
          state.searchDoneCb();
        }
      }
    }
    else {
      canReuseSearchables = false;
      window.console.warn('**** Cancelling current search ****');
    }
  }

  var search = function performSearch(searchDoneCb) {
    prevTextToSearch = currentTextToSearch;

    currentTextToSearch = utils.text.normalize(searchBox.value.trim());
    var thisSearchText = new String(currentTextToSearch);

    if (thisSearchText.length === 0) {
      conctactsListView.classList.remove('nonemptysearch');
      resetState();
    }
    else {
      conctactsListView.classList.add('nonemptysearch');
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
    if(uuid) {
      out = searchTextCache[uuid];
      if(!out) {
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

  var cleanContactsList = function cleanContactsList() {
    if (favoriteGroup) {
      favoriteGroup.classList.add('hide');
    }
  };

  var getContactsDom = function contactsDom() {
    if (!contactNodes) {
      var itemsSelector = ".contact-item:not([data-uuid='#id#'])," +
                        ".block-item:not([data-uuid='#uid#'])";
      contactNodes = list.querySelectorAll(itemsSelector);
    }

    return contactNodes;
  }

  var getContactsToSearch = function getContactsToSearch(newText, prevText) {
    var out;
    if (canReuseSearchables && newText.length > prevText.length &&
        prevText.length > 0 && newText.indexOf(prevText) === 0) {
      out = searchableNodes || getContactsDom();
    } else {
      searchList.innerHTML = '';
      currentSet = {};
      out = getContactsDom();
      canReuseSearchables = false;
    }

    return out;
  }

  var isInSearchMode = function isInSearchMode() {
    return inSearchMode;
  }

  // When the cancel button inside the input is clicked
  document.addEventListener('cancelInput', function() {
    searchBox.focus();
    conctactsListView.classList.remove('nonemptysearch');
    resetState();
  });

  return {
    'init': init,
    'search': search,
    'enterSearchMode': enterSearchMode,
    'exitSearchMode': exitSearchMode,
    'isInSearchMode': isInSearchMode
  };
})();
