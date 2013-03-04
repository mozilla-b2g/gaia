'use strict';

var fbFriends = window.fbFriends || {};

fbFriends.List = (function() {
  var groupsList = document.querySelector('#groups-list');

  var load = function load(contacts, cb) {
    // Hash containing each group
    var groups = {};

    contacts.forEach(function(contact) {
      // Contacts are ordered so it is pretty easy to group them
      var groupName = getGroupName(contact);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      // An array per group
      groups[groupName].push(contact);
    });

    var agroups = Object.keys(groups);

    var fragment = document.createDocumentFragment();

    // For each group
    agroups.forEach(function(group) {
      // New element appended
      var ele = utils.templates.append(groupsList, {
        group: group,
        letter: getGroupLetter(group)
      }, fragment);
      // This is the <ol> and <header> is children[0]
      var list = ele.children[1];

      // Array of friends
      var friends = groups[group];
      // For each friend in the group
      friends.forEach(function(friend) {
        var searchInfo = [];
        var searchable = ['givenName', 'familyName'];
        searchable.forEach(function(field) {
          if (friend[field] && friend[field][0]) {
            searchInfo.push(friend[field][0]);
          }
        });

        // Enabling searching by email
        if (friend['email1']) {
          searchInfo.push(friend['email1']);
        }

        friend.search = utils.text.normalize(searchInfo.join(' '));

        // New friend appended
        utils.templates.append(list, friend);
      });

      // Template is deleted from the list
      list.removeChild(list.firstElementChild);
    });

    groupsList.innerHTML = ''; // Deleting template
    groupsList.appendChild(fragment);

    FixedHeader.init('#mainContent', '#fixed-container',
                     '.fb-import-list header');
    if (typeof cb === 'function') {
      // We wait a delay depending on number of nodes (the curtain is displayed)
      window.setTimeout(function () { cb(); }, contacts.length * 2);
    }
  };

  function getStringToBeOrdered(contact) {
    var ret = [];

    ret.push(contact.familyName ? contact.familyName[0] : '');
    ret.push(contact.givenName ? contact.givenName[0] : '');

    return ret.join('');
  }

  function getGroupName(contact) {
    var ret = getStringToBeOrdered(contact);

    ret = ret.charAt(0).toUpperCase();
    ret = ret.replace(/[ÁÀ]/ig, 'A');
    ret = ret.replace(/[ÉÈ]/ig, 'E');
    ret = ret.replace(/[ÍÌ]/ig, 'I');
    ret = ret.replace(/[ÓÒ]/ig, 'O');
    ret = ret.replace(/[ÚÙ]/ig, 'U');

    var code = ret.charCodeAt(0);
    if (code < 65 || code > 90) {
      ret = 'und';
    }
    return ret;
  }

  function getGroupLetter(group) {
    return group === 'und' ? '#' : group;
  }

  return {
    'load': load
  };
})();
