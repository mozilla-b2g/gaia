'use strict';

var fbFriends = window.fbFriends || {};

fbFriends.List = (function() {
  var groupsList = document.querySelector('#groups-list');

  function contactsLoaded() {
     var figures = document.querySelectorAll('#groups-list img');
      for (var i = 0; i < figures.length; i++) {
        var figure = figures[i];
        var src = figure.dataset.src;
        if (src && src !== 'null') {
          figure.src = src;
        }
      }
  }

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

    // For each group
    agroups.forEach(function(group) {
      // New element appended
      var ele = utils.templates.append(groupsList, {group: group});
      ele.addEventListener('click', fb.importer.ui.selection);

      // Array of friends
      var friends = groups[group];
      // For each friend in the group
      friends.forEach(function(friend) {
        var searchInfo = [];
        var searchable = ['givenName', 'familyName', 'org'];
        searchable.forEach(function(field) {
          if (friend[field] && friend[field][0]) {
            searchInfo.push(friend[field][0]);
          }
        });
        friend.search = normalizeText(searchInfo.join(' '));
        // New friend appended
        utils.templates.append(ele, friend);
        // We check wether this friend was in the AB or not before
      });
    });

    groupsList.removeChild(groupsList.children[0]); // Deleting template
    FixedHeader.init('#mainContent', '#fixed-container', 'h2.block-title');

    if (typeof cb === 'function') {
      window.setTimeout(function() { cb(); }, 0);
    }

    // Finally images are loaded
    contactsLoaded();

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

  return {
    'load': load
  };
})();
