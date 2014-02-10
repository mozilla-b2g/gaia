'use strict';

var contacts = window.contacts || {};

if (!contacts.MatchingUI) {
  contacts.MatchingUI = (function() {

    var _ = navigator.mozL10n.get;

    var CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

    // Counter for checked list items
    var checked = 0;

    // Hash contains identifiers of checked contacts
    var checkedContacts = {};

    var mergeButton, contactsList, duplicateMessage, title;
    var matchingResults;
    var matchingDetails, matchingDetailList, matchingFigure, matchingImg,
        matchingName;

    // Field order when showing matching details main reason
    var fieldOrder = ['tel', 'email', 'name'];

    function init() {
      mergeButton = document.getElementById('merge-action');
      if (!mergeButton) {
        return;
      }

      duplicateMessage = document.querySelector('#duplicate-msg > p');
      contactsList = document.querySelector('#contacts-list-container > ol');
      title = document.getElementById('title');

      document.getElementById('merge-close').addEventListener('click', onClose);
      contactsList.addEventListener('click', onClick);
      mergeButton.addEventListener('click', onMerge);

      matchingDetails = document.querySelector('#matching-details');
      matchingFigure = document.querySelector('#matching-figure');
      matchingDetailList = matchingDetails.querySelector('#matching-list');
      matchingImg = matchingDetails.querySelector('img');
      matchingName = matchingDetails.querySelector('figcaption');

      matchingDetails.querySelector('button').onclick = function() {
        hideMatchingDetails();
      };
    }

    function load(type, contact, results, cb) {
      matchingResults = results;

      document.body.dataset.mode = type;
      var params = { name: getDisplayName(contact) };

      if (type === 'matching') {
        // "Suggested duplicate contacts for xxx"
        duplicateMessage.textContent = _('suggestedDuplicateContacts', params);
      } else {
        title.textContent = _('duplicatesFoundTitle');
        // "xxx duplicates information in the following contacts"
        duplicateMessage.textContent = _('duplicatesFoundMessage', params);
      }

      // Rendering the duplicate contacts list
      renderList(results, cb);
    }

    var listDependencies = ['/contacts/js/utilities/image_loader.js',
                            '/contacts/js/utilities/templates.js'];

    function renderList(contacts, success) {
      LazyLoader.load(listDependencies, function loaded() {
        // For each contact in the list
        var contactsKeys = Object.keys(contacts);
        contactsKeys.forEach(function(id) {
          // New contact appended
          checkedContacts[id] = id;
          var contact = cookContact(contacts[id]);
          var item = utils.templates.append(contactsList, contact);
          if (contact.email1 === '') {
            var emailField = item.querySelector('p:last-child');
            emailField && emailField.parentNode.removeChild(emailField);
          }
        });

        checked = contactsKeys.length;
        checkMergeButton();

        // The template is deleted from the list
        contactsList.removeChild(contactsList.firstElementChild);
        new ImageLoader('#main', 'li');
        setTimeout(success);
      });
    }

    /*
     * It creates a new copy becase it is forbidden to add new attributes to
     * original contacts provided by the API
     *
     * @param(Object) Contact object provided by Gecko
     */
    function cookContact(matching) {
      var contact = matching.matchingContact;
      var reasons = matching.matchings || {};

      var out = {};

      populate(contact, out, Object.getOwnPropertyNames(contact));
      populate(contact, out,
                    Object.getOwnPropertyNames(Object.getPrototypeOf(contact)));

      out.displayName = getDisplayName(contact);
      out.mainReason = selectMainReason(reasons);
      var photo = ContactPhotoHelper.getThumbnail(out);
      if (photo) {
        out.thumb = window.URL.createObjectURL(photo);
      }

      return out;
    }

    function getCompleteName(contact) {
      var givenName = Array.isArray(contact.givenName) ?
                      contact.givenName[0] : '';

      var familyName = Array.isArray(contact.familyName) ?
                      contact.familyName[0] : '';

      var completeName = givenName && familyName ?
                         givenName + ' ' + familyName :
                         givenName || familyName;

      return completeName;
    }

    // Fills the contact data to display if no givenName and familyName
    function getDisplayName(contact) {
      if (hasName(contact)) {
        return getCompleteName(contact);
      }

      var name = [];
      if (Array.isArray(contact.name) && contact.name[0] &&
          contact.name[0].trim()) {
        name.push(contact.name[0]);
      } else if (contact.org && contact.org[0] && contact.org[0].trim()) {
        name.push(contact.org[0]);
      } else if (contact.tel && contact.tel[0]) {
        name.push(contact.tel[0].value);
      } else if (contact.email && contact.email[0]) {
        name.push(contact.email[0].value);
      } else {
        name.push(_('noName'));
      }

      return name[0];
    };

    function hasName(contact) {
      return (Array.isArray(contact.givenName) && contact.givenName[0] &&
                contact.givenName[0].trim()) ||
              (Array.isArray(contact.familyName) && contact.familyName[0] &&
                contact.familyName[0].trim());
    };

    function selectMainReason(matchings) {
      var out = '';

      for (var j = 0; j < fieldOrder.length; j++) {
        var aField = fieldOrder[j];
        var theMatchings = matchings[aField];
        if (Array.isArray(theMatchings) && theMatchings[0]) {
          out = theMatchings[0].matchedValue;
          if (out) {
            break;
          }
        }
      }
      return out;
    }

    function populate(source, target, propertyNames) {
      propertyNames.forEach(function(property) {
        var propertyValue = source[property];
        if (propertyValue) {
          target[property] = propertyValue;
        }
      });
    }

    function onClose(e) {
      e.stopPropagation();
      e.preventDefault();

      parent.postMessage({
        type: 'window_close',
        data: ''
      }, CONTACTS_APP_ORIGIN);
    }

    // Obtains the action from the contacts list from the click coordinates
    // The action can be: 'check' or 'detail'
    // If it is 'check' the input check will be toggled
    // If it is 'detail' the matching contact details overlay will be show
    function getActionOverList(event) {
      // 40% percent of the horizontal width will be consider 'check' area
      var CHECKING_AREA_WIDTH = 0.4;

      var out = 'detail';
      if (event.clientX <= window.innerWidth * CHECKING_AREA_WIDTH) {
        out = 'check';
      }

      return out;
    }

    function onClick(e) {
      var target = e.target;

      var uuid;
      if (target && target.dataset.uuid) {
        uuid = target.dataset.uuid;
      }

      var targetAction = getActionOverList(e);
      if (targetAction === 'check') {
        var checkbox = target.querySelector('input[type="checkbox"]');
        setChecked(target, checkbox, !checkbox.checked, uuid);
        checkMergeButton();
      }
      else if (uuid) {
        showMatchingDetails(uuid);
        renderMatchingDetails(uuid);
      }
    }

    function resetContentDetails() {
      matchingName.classList.remove('selected');
      if (matchingImg.src) {
        window.URL.revokeObjectURL(matchingImg.src);
        matchingImg.src = '';
        matchingImg.classList.add('hide');
      }
      matchingName.textContent = '';
      matchingDetailList.innerHTML = '';
    }

    function hideMatchingDetails() {
      matchingDetails.classList.remove('fade-in');
      matchingDetails.classList.add('fade-out');

      matchingDetails.addEventListener('animationend', function cd_fadeOut(ev) {
        matchingDetails.removeEventListener('animationend', cd_fadeOut);
        matchingDetails.classList.add('no-opacity');
        matchingDetails.classList.add('hide');

        resetContentDetails();
      });
    }

    function imageLoaded() {
      matchingImg.classList.remove('hide');
      doShowMatchingDetails();
    }

    function imageLoadingError() {
      matchingImg.classList.add('hide');
      doShowMatchingDetails();
    }

    function showMatchingDetails(uuid) {
      var theContact = matchingResults[uuid].matchingContact;
      var photo = ContactPhotoHelper.getThumbnail(theContact);
      if (photo) {
        // If the contact has a photo, preload it before showing the overlay.
        var url = window.URL.createObjectURL(photo);

        // Check to see if the image is already loaded, if so process
        // it immediately.  We won't get another 'load' event by resetting the
        // same url.
        if (matchingImg.src === url && matchingImg.naturalWidth) {
          window.URL.revokeObjectURL(url);
          imageLoaded();
          return;
        }

        matchingImg.onload = imageLoaded;
        matchingImg.onerror = imageLoadingError;
        matchingImg.src = url;
      }
      else {
        doShowMatchingDetails();
      }
    }

    function doShowMatchingDetails() {
      matchingDetails.classList.remove('hide');
      matchingDetails.classList.remove('fade-out');
      matchingDetails.classList.add('fade-in');

      matchingDetails.addEventListener('animationend', function cd_fadeIn(ev) {
        matchingDetails.removeEventListener('animationend', cd_fadeIn);
        matchingDetails.classList.remove('no-opacity');
      });
    }

    function isMatch(matchings, aField, fieldValue) {
      var noMatch = true;
      if (matchings[aField]) {
        // Using every to short circuit the checking when a match is found.
        noMatch = matchings[aField].every(function(obj) {
          var val = fieldValue.value || fieldValue;
          if (obj.matchedValue === val) {
            return false;
          }
          return true;
        });
      }
      return !noMatch;
    }

    function renderMatchingDetails(uuid) {
      var fields = ['name', 'photo', 'org', 'tel', 'email', 'adr'];

      var theContact = matchingResults[uuid].matchingContact;
      var matchings = matchingResults[uuid].matchings;
      if (!hasName(theContact)) {
        theContact.name = [getDisplayName(theContact)];
      }
      fields.forEach(function(aField) {
        if (!Array.isArray(theContact[aField]) || !theContact[aField][0]) {
          return;
        }

        theContact[aField].forEach(function(fieldValue) {
          if (!fieldValue) {
            return;
          }

          switch (aField) {
            case 'name':
              matchingName.textContent = fieldValue;
              if (isMatch(matchings, aField, fieldValue)) {
                matchingName.classList.add('selected');
              }
            break;
            case 'photo':
              matchingImg.alt = getDisplayName(theContact);
            break;
            case 'tel':
            case 'email':
              var item = document.createElement('li');
              if (isMatch(matchings, aField, fieldValue)) {
                item.classList.add('selected');
              }
              item.textContent = fieldValue.type + ', ' + fieldValue.value;
              matchingDetailList.appendChild(item);
            break;
            case 'adr':
              var item = document.createElement('li');
              if (isMatch(matchings, aField, fieldValue)) {
                item.classList.add('selected');
              }
              var adrFields = ['streetAddress', 'locality',
                               'region', 'countryName'];
              adrFields.forEach(function(addrField) {
                if (fieldValue[addrField]) {
                  var li = document.createElement('li');
                  li.textContent = fieldValue[addrField];
                  item.appendChild(li);
                }
              });
              matchingDetailList.appendChild(item);
            break;
            default:
              var item = document.createElement('li');
              item.textContent = fieldValue.value || fieldValue || '';
              matchingDetailList.appendChild(item);
            break;
          }
        });
      });
    }

    function displayMatchingDetails(uuid) {
      showMatchingDetails(uuid);
      renderMatchingDetails(uuid);
    }

    function checkMergeButton() {
      navigator.mozL10n.localize(mergeButton, 'mergeActionButtonLabel',
                                                                { n: checked });
      mergeButton.disabled = (checked === 0);
    }

    function setChecked(item, element, value, uuid) {
      if (element.checked !== value) {
        // We have to take into account the action whether the value changes
        if (value) {
          ++checked;
          checkedContacts[uuid] = uuid;
          item.setAttribute('aria-disabled', false);
        } else {
          --checked;
          delete checkedContacts[uuid];
          item.setAttribute('aria-disabled', true);
        }
      }
      element.checked = value;
    }

    function onMerge(e) {
      e.stopPropagation();
      e.preventDefault();

      contacts.MatchingController.merge(checkedContacts);
    }

    // We are going to initialize this module to get references to DOM elements
    init();

    return {
      init: init,

      /*
       * Loads the UI that implements the merge of duplicate contacts
       *
       * @param{Object} Master contact
       *
       * @param{Object} Hash of matching contacts from contacts.Matcher module
       *
       * @param{Function} Success callback when the UI is ready
       *
       */
      load: load,

      /*
       * Displays the details of a contact matching in an overlay.
       * @param {String} Unique user id.
       */
      displayMatchingDetails: displayMatchingDetails
    };

  })();
}
