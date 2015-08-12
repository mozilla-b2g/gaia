/* global Contacts */
/* global ICEData */
/* global ConfirmDialog */
/* global ContactsService */
/* global HeaderUI */
/* global Search */

/**
 * ICE Settings view. In charge of selecting
 * the contacts for emergency and keeping sync
 * the datastore to share those contacts with
 * dialer and lockscreen.
 */

'use strict';

var contacts = window.contacts || {};

(function(exports) {

  var iceSettingsPanel,
    iceSettingsHeader,
    iceContactItems = [],
    iceContactCheckboxes = [],
    iceContactButtons = [],
    iceScreenInitialized = false,
    currentICETarget;

  /**
   * Redraws the ICE contact list. This is not an expensive
   * operation since we have a maximun of 2 contacts.
   * The first time executed will attach listeners for the
   * frame ui.
   */
  var init = function ice_init() {
    if (iceScreenInitialized) {
      return;
    }
    // ICE DOM elements
    iceSettingsPanel = document.getElementById('ice-settings');
    iceSettingsHeader = document.getElementById('ice-settings-header');

    iceContactItems.push(document.getElementById('ice-contacts-1-switch'));
    iceContactItems.push(document.getElementById('ice-contacts-2-switch'));

    iceContactCheckboxes.push(iceContactItems[0]
                          .querySelector('[name="ice-contact-1-enabled"]'));
    iceContactCheckboxes.push(iceContactItems[1]
                          .querySelector('[name="ice-contact-2-enabled"]'));
    iceContactButtons.push(document.getElementById('select-ice-contact-1'));
    iceContactButtons.push(document.getElementById('select-ice-contact-2'));

    iceContactButtons[0].dataset.contactId = '';
    iceContactButtons[1].dataset.contactId = '';

    // ICE Events handlers
    iceSettingsHeader.addEventListener('action', function(){
      contacts.Settings.navigation.back();
    });

    // All the controls do the same, just modifications on the
    // specific order.
    iceContactItems.forEach(function(item, index) {
      iceContactCheckboxes[index].addEventListener('change', function(i) {
        return function(evt) {
          var localIceContacts = ICEData.iceContacts;
          var wasActive = !iceContactCheckboxes[i].checked;

          if (wasActive) {
            resetIceGroupState(i);
            if (localIceContacts[i] && localIceContacts[i].id) {
              setICEContact(null, i, !wasActive);
            }
          }
          else {
            iceContactButtons[i].disabled = false;
          }
        };
      }(index));
    });

    iceContactButtons.forEach(function(element){
      element.addEventListener('click', function(evt) {
        showSelectList(evt.target.id);
      });
      // Bug 1071064 If users clicked on disabled button, the switch was checked
      element.parentNode.addEventListener('click', (evt) => {
        evt.stopPropagation();
      });
    });

    iceScreenInitialized = true;
  };

  function reloadButtonsState(cb) {
    ICEData.load().then(retrieveContactData.bind(null, cb));
  }

  function retrieveContactData(cb) {
    var iceContactsData = [];
    var iceContactsIds = ICEData.iceContacts;
    var numRetrievedContacts = 0;

    iceContactsIds.forEach(function(iceContact, index) {
      ContactsService.get(iceContact.id, function(cindex, contact) {
        var theContact = {
          active: iceContactsIds[cindex].active,
          mozContact: contact
        };

        iceContactsData[cindex] = theContact;

        numRetrievedContacts++;

        if (numRetrievedContacts === 2) {
          setButtonsState(iceContactsData, cb);
        }
      }.bind(null, index));
    });
  }

  function refresh(done) {
    if (!iceScreenInitialized) {
      init();
    }
    reloadButtonsState(done);
  }

  /**
   * Given an object representing the internal state
   * fills the UI elements.
   * @params iceContactsIds (Array) list of contacts and state
   */
  function setButtonsState(iceContactsData, done) {
    iceContactsData.forEach(setIceButtonState);

    typeof done === 'function' && done();
  }

  function setIceButtonState(iceContactData, index) {
    if (!iceContactData) {
      return;
    }

    if (iceContactData.mozContact) {
      var iceContact = iceContactData.mozContact;

      var givenName = (Array.isArray(iceContact.givenName) &&
                       iceContact.givenName[0]) || '';
      var familyName = (Array.isArray(iceContact.familyName) &&
                        iceContact.familyName[0]) || '';

      var display = [givenName, familyName];
      var iceLabel = display.join(' ').trim();
      // If contact has no name we the first tel number will be used
      if (!iceLabel) {
        if (Array.isArray(iceContact.tel) && iceContact.tel[0]) {
          iceLabel = iceContact.tel[0].value.trim();
        }
      }

      buildIceContactUI(index, iceLabel, iceContact.id,
                        iceContactData.active);
    }
    else {
        resetIceGroupState(index);
    }
  }

  function buildIceContactUI(index, label, contactId, active) {
    iceContactCheckboxes[index].checked = active;
    iceContactButtons[index].disabled = !active;

    var bdi = document.createElement('bdi');
    bdi.classList.add('ice-contact');
    bdi.textContent = label;
    iceContactButtons[index].innerHTML = '';
    iceContactButtons[index].appendChild(bdi);
    iceContactButtons[index].dataset.contactId = contactId;
  }

  function resetIceGroupState(index) {
    iceContactCheckboxes[index].checked = false;

    iceContactButtons[index].disabled = true;
    iceContactButtons[index].innerHTML = '';
    iceContactButtons[index].dataset.contactId = '';
    iceContactButtons[index].setAttribute('data-l10n-id', 'ICESelectContact');
  }

  function resetIceGroupStates() {
    for(var j = 0; j < iceContactCheckboxes.length; j++) {
      resetIceGroupState(j);
    }
  }

  function goBack() {
    contacts.List.clearClickHandlers();
    contacts.List.handleClick(Contacts.showContactDetail);
    HeaderUI.setNormalHeader();

    var hasICESet = ICEData.iceContacts.find(function(x) {
      return x.active === true;
    });

    if (!hasICESet) {
      resetIceGroupStates();
    }

    if (window.Search && Search.isInSearchMode()) {
      Search.exitSearchMode();
    }

    contacts.Settings.navigation.back(() => {
      hasICESet && contacts.List.toggleICEGroup(true);
    });
  }

  /**
   * Given a contact id, saves it internally. Also restores the contact
   * list default handler.
   * In case of not valid contact it will display a message on the screen
   * indicating the cause of the error.
   * @param id (string) contact id
   */
  function selectICEHandler(id) {
    checkContact(id).then(function() {
      setICEContact(id, currentICETarget, true, goBack);
    }, function error(l10nId) {
      var dismiss = {
        title: 'ok',
        callback: function() {
          ConfirmDialog.hide();
        }
      };
      ConfirmDialog.show(null, l10nId || 'ICEUnknownError', dismiss);
    });
  }

  /**
   * Will perform a series of checks to validate the selected
   * contact as a valid ICE contact
   * @param id (string) contact id
   * @return (Promise) fulfilled if contact is valid
   */
  function checkContact(id) {
    return ICEData.load().then(function() {
      return contactNotICE(id).then(contactNotAllowed);
    });
  }

  /**
   * Checks if a contacts is already set as ICE
   * @param id (string) contact id
   * @return (Promise) fulfilled if contact is not repeated,
   *  rejected otherwise
   */
  function contactNotICE(id) {
    return new Promise(function(resolve, reject) {
      var isICE = ICEData.iceContacts.some(function(x) {
        return x.id === id;
      });

      if (isICE) {
        reject('ICERepeatedContact');
      } else {
        resolve(id);
      }
    });
  }

  /**
   * Filter to avoid selecting contacts as ICE if they don't have a phone number
   * or they are a Facebook contact
   * @param id (String) contact id
   * @returns (Promise) Fulfilled if contact has phone
   */
  function contactNotAllowed(id) {
    return new Promise(function(resolve, reject) {
      ContactsService.get(id, function(contact, isFBContact) {
        if(Array.isArray(contact.tel) && contact.tel[0] &&
         contact.tel[0].value && contact.tel[0].value.trim()) {
          resolve(id);
        }
        else if (isFBContact) {
          reject('ICEFacebookContactNotAllowed');
        } else {
          reject('ICEContactNoNumber');
        }
      });
    });
  }

  /**
   * We are using the contact list to choose a contact as ICE. For doing
   * this, we need to setup our own click handler.
   * @para target (HTMLButton) Button click to select an ICE contact
   */
  function showSelectList(target) {
    contacts.List.toggleICEGroup(false);
    HeaderUI.setCancelableHeader(goBack, 'selectContact');
    contacts.Settings.navigation.go('view-contacts-list', 'right-left');
    currentICETarget = target === 'select-ice-contact-1' ? 0 : 1;
    contacts.List.clearClickHandlers();
    contacts.List.handleClick(selectICEHandler);
  }

  /**
   * Set the values for ICE contacts, both in local and in the
   * datastore
   * @param id (string) contact id
   * @param pos (int) current position (0,1)
   * @param active (boolean) ice contact is active or not
   * @param cb (function) callback when ready
   */
  function setICEContact(id, pos, active, cb) {
    ICEData.setICEContact(id, pos, active).then(function() {
      // Only reload contact info in case there is a change in the contact
      if (id === iceContactButtons[pos].dataset.contactId) {
        return;
      }

      ContactsService.get(id, function(contact) {
        var theContact = {
          active: active,
          mozContact: contact
        };
        var iceContactData = [];
        if (pos === 0) {
          iceContactData[1] = null;
        }
        else {
          iceContactData[0] = null;
        }
        iceContactData[pos] = theContact;

        setButtonsState(iceContactData);

        typeof cb === 'function' && cb();
      });
    });
  }

  function reset() {
    iceScreenInitialized = false;
    iceContactItems = [];
    iceContactCheckboxes = [];
    iceContactButtons = [];
    currentICETarget = null;
  }

  var ICE = {
    init: init,
    refresh: refresh,
    reset: reset,
    get initialized() { return iceScreenInitialized; }
  };

  exports.ICE = ICE;

})(window);
