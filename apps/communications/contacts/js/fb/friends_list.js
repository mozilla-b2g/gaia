'use strict';

var FriendListRenderer = (function() {

  // Order criteria
  var orderCriteria = {
    firstName: ['givenName', 'familyName', 'email1'],
    lastName: ['familyName', 'givenName', 'email1']
  };

  var HEADER_LETTERS = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',          // Roman
    'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ' ,           // Greek
    'АБВГДЂЕЁЖЗИЙЈКЛЉМНЊОПРСТЋУФХЦЧЏШЩЭЮЯ' // Cyrillic (Russian + Serbian)
  ].join('');

  // Options by default
  var defaults = {
    container: '#groups-list',
    orderBy: 'lastName'
  };

  // Callback to notify when finish
  var finishCb;
  var totalContacts;
  var lock;
  var CHUNK_SIZE = 10;

  var render = function render(contacts, cb, options) {
    // Populate defaults
    for (var key in defaults) {
      if (typeof options[key] === 'undefined') {
        options[key] = defaults[key];
      }
    }

    finishCb = cb;
    totalContacts = contacts.length;

    lock = navigator.requestWakeLock('cpu');

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

    // We are going to delete the paragraph that paints the other order for the
    // contact's name from template...
    var notRenderedParagraph = groupsList.querySelector('[data-order-by="' +
                   (orderBy === 'firstName' ? 'lastName' : 'firstName') + '"]');
    if (notRenderedParagraph) {
      notRenderedParagraph.parentNode.removeChild(notRenderedParagraph);
    }
    // Start first element of HEADER_LETTERS (A)
    var letterStart = 0;
    doRenderGroupChunk(letterStart, HEADER_LETTERS[letterStart],
                       groupsList, groups);
  };

  // Controls group rendering one by one
  function doRenderGroupChunk(index, group, groupsList, groups) {
    renderGroup(groupsList, group, groups[group], function(fragment) {
      if (fragment) {
        groupsList.appendChild(fragment);
      }
      fragment = null;

      var headerLettersLength = HEADER_LETTERS.length;
      if (index + 1 <= headerLettersLength) {
        window.setTimeout(function renderNextGroup() {
          doRenderGroupChunk(index + 1, HEADER_LETTERS[index + 1],
                        groupsList, groups);
        });
      }
      else if (group != '#') {
        window.setTimeout(function renderNextGroup() {
          doRenderGroupChunk(index + 1, '#', groupsList, groups);
        });
      }
      else {
         // Deleting template
        groupsList.removeChild(groupsList.firstElementChild);

         if (typeof finishCb === 'function') {
        // We wait a delay depending on number of nodes
        // Afterwards the curtain will be displayed
          window.setTimeout(finishCb, totalContacts * 2);
        }
        if (lock) {
          lock.unlock();
        }
      }
    });
  }

  // Renders the items in a group in chunks
  function doRenderGroupItems(from, groupsList, group, friends, element, cb) {
    var end = from + CHUNK_SIZE;

    // This is the <ol> and <header> is children[0]
    var list = element.children[1];

    for (var i = from; i < end && i < friends.length; i++) {
      var friend = friends[i];

      if (friend.search && friend.search.length > 0) {
        // Set the picture size
        var box = importUtils.getPreferredPictureBox();
        friend.picwidth = box.width;
        friend.picheight = box.height;

        friend.search = Normalizer.toAscii(friend.search);

        // New friend appended
        utils.templates.append(list, friend);
      }
    }

    if (i < friends.length) {
      window.setTimeout(function renderNextChunk() {
        doRenderGroupItems(end, groupsList, group, friends, element, cb);
      });
    }
    else {
      list.removeChild(list.firstElementChild);
      cb();
    }
  }

  // Renders a group
  function renderGroup(groupsList, group, friends, cb) {
    if (!friends || friends.length === 0) {
      window.setTimeout(cb);
      return;
    }

    // Document fragment that will hold the group nodes
    var fragment = document.createDocumentFragment();

    // New element appended
    var element = utils.templates.append(groupsList, {
      group: group
    }, fragment);

    // For each friend in the group
    doRenderGroupItems(0, groupsList, group, friends, element, function() {
      cb(fragment);
    });
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

    if (HEADER_LETTERS.indexOf(ret) < 0) {
      ret = '#';
    }
    return ret;
  }

  return {
    'render': render
  };
})();
