'use strict';

var contacts = window.contacts || {};

contacts.Search = (function() {
  var favoriteGroup,
      inSearchMode = false,
      conctactsListView,
      searchBox,
      searchNoResult;

  var init = function load(_conctactsListView, _groupFavorites) {
    conctactsListView = _conctactsListView;
    favoriteGroup = _groupFavorites;
    searchBox = document.getElementById('search-contact');
    searchNoResult = document.getElementById('no-result');
  }

  //Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    evt.preventDefault();
    searchNoResult.classList.add('hide');
    conctactsListView.classList.remove('searching');
    searchBox.value = '';
    inSearchMode = false;
    // Show elements that were hidden for the search
    if (favoriteGroup) {
      favoriteGroup.classList.remove('hide');
    }

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
      conctactsListView.classList.add('searching');
      cleanContactsList();
      inSearchMode = true;
    }
    return false;
  };

  var search = function performSearch() {

    var pattern = new RegExp(normalizeText(searchBox.value.trim()), 'i');
    var count = 0;

    var allContacts = getContactsDom();
    for (var i = 0; i < allContacts.length; i++) {
      var contact = allContacts[i];
      contact.classList.add('search');
      var body = contact.querySelector('[data-search]');
      var text = body ? body.dataset['search'] : contact.dataset['search'];
      if (!pattern.test(text)) {
        contact.classList.add('hide');
      } else {
        contact.classList.remove('hide');
        count++;
      }
      document.dispatchEvent(new CustomEvent('onupdate'));
    }

    if (count == 0) {
      searchNoResult.classList.remove('hide');
    } else {
      searchNoResult.classList.add('hide');
    }
  };

  var cleanContactsList = function cleanContactsList() {
    if (favoriteGroup) {
      favoriteGroup.classList.add('hide');
    }
  };

  var getContactsDom = function contactsDom() {
    var list = document.getElementById('groups-list');
    var items = ".contact-item:not([data-uuid='#id#'])," +
                        ".block-item:not([data-uuid='#id#'])";
    return list.querySelectorAll(items);
  }

  // When the cancel button inside the input is clicked
  document.addEventListener('cancelInput', function() {
    search();
  });

  return {
    'init': init,
    'search': search,
    'enterSearchMode': enterSearchMode,
    'exitSearchMode': exitSearchMode
  };
})();
