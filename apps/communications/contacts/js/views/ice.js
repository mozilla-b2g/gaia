/* global ICEData */
/* global ImageLoader */
/* global LazyLoader */
/* global MainNavigation */
/* global fb */
'use strict';

(function(exports) {

  var contactsIds = null;
  var rowBuilderFn = null;
  var imgLoader = null;
  var initialized = false;
  var iceListDisplayed = false;

  /**
   * Initialises the component by passing a list of ICE ids,
   * a function that knows how to build contact list rows and
   * another function to perform actions when clicking on a
   * ICE contact.
   * This function should be the same than the contacts list one
   * to keep the same behavior (activities, select, etc.)
   * @param ids (Array) array of contact ids
   * @param rowBuilder (function) function that paints contac list
   *  rows, shared with the contact list
   * @param clickHandler (function) action to perform when clicked
   *  on a item
   */
  function init(ids, rowBuilder, clickHandler) {
    rowBuilderFn = rowBuilder;
    contactsIds = ids;

    imgLoader = new ImageLoader('#ice-list', 'li');
    buildICEContactsList();

    if (initialized) {
      return;
    }

    initialized = true;

    LazyLoader.load(['/contacts/js/fb_resolver.js'], function() {
      imgLoader.setResolver(fb.resolver);
    });

    // Initialise common controls
    document.getElementById('ice-header').addEventListener(
      'action', hideICEList);
    document.getElementById('ice-list').addEventListener('click', clickHandler);

    LazyLoader.load(['/contacts/js/utilities/ice_data.js'], function() {
      listenForChanges();
    });
  }

  // Once the list is built, we need to be aware of possible changes in
  // contacts. In that case rebuild the whole list, since ICE list is meant
  // to be a small set (2 currently) of contacts.
  function listenForChanges() {
    ICEData.listenForChanges(function(newList) {
      contactsIds = [];
      newList.forEach(function(iceContact) {
        if (iceContact.id && iceContact.active) {
          contactsIds.push(iceContact.id);
        }
      });
      buildICEContactsList();
    });
  }

  // Clone the nodes on the contacts list, also rebuild them with
  // the row builder function passed on initialization.
  // Due to the nature of the contacts list, despite of having the
  // nodes, those may have not being initialized, that's why we need
  // the use of this builder function
  function buildICEContactsList() {
    var iceList = document.getElementById('ice-group');
    iceList.innerHTML = '';

    contactsIds.forEach(function(id) {
      var node = document.querySelector('[data-uuid="' + id + '"]');
      if (!node) {
        return;
      }
      node = rowBuilderFn(id, node);
      iceList.appendChild(node);
    });

    imgLoader.reload();
  }

  function showICEList() {
    MainNavigation.go('ice-view', 'right-left');
    iceListDisplayed = true;
  }

  function hideICEList() {
    MainNavigation.back();
    iceListDisplayed = false;
  }

  var ICEView = {
    init: init,
    showICEList: showICEList,
    hideICEList: hideICEList,
    get iceListDisplayed() {
      return iceListDisplayed;
    }
  };

  exports.contacts.ICEView = ICEView;

})(window);
