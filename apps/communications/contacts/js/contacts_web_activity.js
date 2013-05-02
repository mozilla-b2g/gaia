/*
 * contacts_web_activity.js:
 *
 * This "Contacts" object is the minimized duplicate of the Contacts object in contacts.js.
 *
 * It handles the function calls from other modules in the scenarios of 
 * handling the "new" and "update" webcontacts/contact Web Activities.
 *
 * This Contacts object is called by these modules:
 * - contacts_form.js
 * - contacts_list.js
 * - new.js (main module of the new Web Activity)
 * - update.js (main module of the update Web Activity)
 */

'use strict'

var Contacts = (function() {
  var navigation = null;

  var setNavigation = function setNavigation(_navigation) {
    navigation = _navigation;
  };

  var goToSelectTag = function goToSelectTag(event) {
    var contactsTag = ContactsTag;
    var target = event.currentTarget.children[0];
    var tagList = target.dataset.taglist;
    var tagOptions = contactsTag.getTagOptions();
    var options = tagOptions[tagList];

    contactsTag.fillTagOptions(options, tagList, target);
    if (navigation instanceof Object) {
      navigation.go('view-select-tag', 'right-left');
    } else {
      console.error('The "navigation" attribute is undefined.');
    }
    window.navigator.mozKeyboard.removeFocus();
  };

  var updatePhoto = function updatePhoto(photo, dest) {
    var background = '';
    if (photo != null) {
      background = 'url(' + URL.createObjectURL(photo) + ')';
    }
    dest.style.backgroundImage = background;
  };

  // Checks if an object fields are empty, by empty means
  // field is null and if it's an array it's length is 0
  var isEmpty = function isEmpty(obj, fields) {
    if (obj == null || typeof(obj) != 'object' ||
        !fields || !fields.length) {
      return true;
    }
    var attr;
    var isArray;
    for (var i = 0; i < fields.length; i++) {
      attr = fields[i];
      if (obj.hasOwnProperty(attr) && obj[attr]) {
        if (Array.isArray(obj[attr])) {
          if (obj[attr].length > 0) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    return true;
  };

  var loadFacebook = function loadFacebook(callback) {
    if (!fbLoader.loaded) {
      fbLoader.load();
      window.addEventListener('facebookLoaded', function onFbLoaded() {
        window.removeEventListener('facebookLoaded', onFbLoaded);
        callback();
      });
    } else {
      callback();
    }
  };

  var extractParams = function extractParams(url) {
    if (!url) {
      return -1;
    }
    var ret = {};
    var params = url.split('&');
    for (var i = 0; i < params.length; i++) {
      var currentParam = params[i].split('=');
      ret[currentParam[0]] = currentParam[1];
    }
    return ret;
  };

  var addExtrasToContact = function addExtrasToContact(extrasString, currentContact) {
    try {
      var extras = JSON.parse(decodeURIComponent(extrasString));
      for (var type in extras) {
        var extra = extras[type];
        if (currentContact[type]) {
          if (Array.isArray(currentContact[type])) {
            var joinArray = currentContact[type].concat(extra);
            currentContact[type] = joinArray;
          } else {
            currentContact[type] = extra;
          }
        } else {
          currentContact[type] = Array.isArray(extra) ? extra : [extra];
        }
      }
    } catch (e) {
      console.error('Extras malformed');
      return null;
    }
  };

  return {
    'setNavigation': setNavigation,
    'goToSelectTag': goToSelectTag,
    'updatePhoto': updatePhoto,
    'loadFacebook': loadFacebook,
    'isEmpty': isEmpty,
    'extractParams': extractParams,
    'addExtrasToContact': addExtrasToContact
  };
})();
