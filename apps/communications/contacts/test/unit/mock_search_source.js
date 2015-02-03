'use strict';
/* exported MockSearchSource */

var MockSearchSource = function() {
  var NODE_SELECTOR = 'section:not([data-nonsearchable="true"]) > ol > li';

  return {
    getNodes: function() {
      var contactsListView = document.getElementById('view-contacts-list');
      var domNodes = contactsListView.querySelectorAll(NODE_SELECTOR);
      return Array.prototype.slice.call(domNodes);
    },

    getFirstNode: function() {
      var contactsListView = document.getElementById('view-contacts-list');
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

    expectMoreNodes: function() {
      return false;
    },

    clone: function(node) {
      return node.cloneNode(true);
    },

    getNodeById: function(id) {
      var contactsListView = document.getElementById('view-contacts-list');
      return contactsListView.querySelector('[data-uuid="' + id + '"]');
    },

    getSearchText: function(node) {
      return node.dataset.search;
    },

    click: function() {}
  };
}();
