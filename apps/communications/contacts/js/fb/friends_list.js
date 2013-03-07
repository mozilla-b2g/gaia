'use strict';

var FriendListRenderer = (function() {

  // Order criteria
  var orderCriteria = {
    firstName: ['givenName', 'familyName', 'email1'],
    lastName: ['familyName', 'givenName', 'email1']
  };

  // Options by default
  var defaults = {
    container: '#groups-list',
    orderBy: 'lastName'
  };

  var render = function render(contacts, cb, options) {
    // Populate defaults
    for (var key in defaults) {
      if (typeof options[key] === 'undefined') {
        options[key] = defaults[key];
      }
    }

    doRender(contacts, cb, options);
  };

  var doRender = function doRender(contacts, cb, options) {
    var groupsList = document.querySelector(options.container);
    var orderBy = options.orderBy;
    var order = orderCriteria[orderBy];

    // Sorting friend list
    contacts.sort(function(a, b) {
      return getStringToBeOrdered(a, order).localeCompare(
                                                getStringToBeOrdered(b, order));
    });

    // Hash containing each group
    var groups = {};

    contacts.forEach(function(contact) {
      // Contacts are ordered so it is pretty easy to group them
      var groupName = getGroupName(contact, order);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      // An array per group
      groups[groupName].push(contact);
    });

    var fragment = document.createDocumentFragment();

    // We are going to delete the paragraph that paints the other order for the
    // contact's name from template...
    var notRenderedParagraph = groupsList.querySelector('[data-order-by="' +
                   (orderBy === 'firstName' ? 'lastName' : 'firstName') + '"]');
    notRenderedParagraph.parentNode.removeChild(notRenderedParagraph);

    // A..Z groups
    for (var i = 65; i <= 90; i++) {
      var group = String.fromCharCode(i);
      renderGroup(fragment, groupsList, group, groups[group]);
    }

    // # group
    renderGroup(fragment, groupsList, '#', groups['#']);

    groupsList.innerHTML = ''; // Deleting template
    groupsList.appendChild(fragment);

    if (typeof cb === 'function') {
      // We wait a delay depending on number of nodes (the curtain is displayed)
      window.setTimeout(function() { cb(); }, contacts.length * 2);
    }
  };

  function renderGroup(fragment, groupsList, group, friends) {
    if (!friends || friends.length === 0)
      return;

    // New element appended
    var element = utils.templates.append(groupsList, {
      group: group
    }, fragment);

    // This is the <ol> and <header> is children[0]
    var list = element.children[1];

    // For each friend in the group
    friends.forEach(function(friend) {
      if (!friend.search || friend.search.length === 0)
        return;

      friend.search = utils.text.normalize(friend.search);

      // New friend appended
      utils.templates.append(list, friend);
    });

    // Template is deleted from the list
    list.removeChild(list.firstElementChild);
  }

  function getStringToBeOrdered(contact, order) {
    var ret = contact.search;

    if (!ret) {
      ret = [];

      order.forEach(function(field) {
        ret.push(getValue(contact, field));
      });

      ret = contact.search = ret.join('');
    }

    return ret;
  }

  function getValue(contact, field) {
    var out = contact[field];

    if (out) {
      out = Array.isArray(out) ? out[0] : out;
    } else {
      out = '';
    }

    return out;
  };

  function getGroupName(contact, order) {
    var ret = getStringToBeOrdered(contact, order);

    ret = ret.charAt(0).toUpperCase();
    ret = ret.replace(/[ÁÀ]/ig, 'A');
    ret = ret.replace(/[ÉÈ]/ig, 'E');
    ret = ret.replace(/[ÍÌ]/ig, 'I');
    ret = ret.replace(/[ÓÒ]/ig, 'O');
    ret = ret.replace(/[ÚÙ]/ig, 'U');

    var code = ret.charCodeAt(0);
    if (code < 65 || code > 90) {
      ret = '#';
    }
    return ret;
  }

  return {
    'render': render
  };
})();
