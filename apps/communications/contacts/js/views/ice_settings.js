/* global Contacts */
/* global ICEData */


/**
 * ICE Settings view. In charge of selecting
 * the contacts for emergency and keeping sync
 * the datastore to share those contacts with
 * dialer and lockscreen.
 */

'use strict';

var contacts = window.contacts || {};

contacts.ICE = (function() {
  var iceSettingsPanel,
    iceSettingsHeader,
    iceContactItems = [],
    iceContactCheckboxes = [],
    iceContactButtons = [],
    iceScreenLoaded = false,
    currentICETarget;

  /**
   * Redraws the ICE contact list. This is not an expensive
   * operation since we have a maximun of 2 contacts.
   * The first time executed will attach listeners for the
   * frame ui.
   */
  var init = function ice_init(forceReload) {
    if (iceScreenLoaded && !forceReload) {
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

    reloadButtonsState();

    // ICE Events handlers
    iceSettingsHeader.addEventListener('action', function(){
      contacts.Settings.navigation.back();
    });

    // All the controls do the same, just modifications on the
    // specific order.
    iceContactItems.forEach(function(item, index) {
      item.addEventListener('click', function(i) {
        return function(evt) {
          var localIceContacts = ICEData.iceContacts;
          var disabled = iceContactCheckboxes[i].checked;
          iceContactCheckboxes[i].checked = !disabled;
          iceContactItems[i].setAttribute('aria-checked', !disabled);
          iceContactButtons[i].disabled = disabled;
          if (localIceContacts[i] && localIceContacts[i].id) {
            setICEContact(localIceContacts[i].id, i, !disabled);
          }
        };
      }(index));
    });

    iceContactButtons.forEach(function(element){
      element.addEventListener('click', function(evt) {
          showSelectList(evt.target.id);
      });
    });

    // Listen for changes that happen in the ICE contacts
    ICEData.listenForChanges(reloadButtonsState);

    iceScreenLoaded = true;
  };

  function reloadButtonsState() {
    ICEData.load().then(setButtonsState);
  }

  /**
   * Given an object representing the internal state
   * fills the UI elements.
   * @params iceContactsIds (Array) list of contacts and state 
   */
  function setButtonsState(iceContactsIds) {
    iceContactsIds = iceContactsIds || [];
    iceContactsIds.forEach(function(iceContact, index) {
      iceContactCheckboxes[index].checked = iceContact.active || false;
      iceContactButtons[index].disabled = !iceContact.active || false;

      if (iceContact.id) {
        contacts.List.getContactById(iceContact.id, function(contact) {
          var givenName = (contact.givenName && contact.givenName[0]) || '';
          var familyName = (contact.familyName && contact.familyName[0]) || '';
          var display = [givenName, familyName];
          
          var span = document.createElement('span');
          span.classList.add('ice-contact');
          span.textContent = display.join(' ').trim();
          iceContactButtons[index].innerHTML = '';
          iceContactButtons[index].appendChild(span);
        });
      } else {
        iceContactButtons[index].innerHTML = '';
        iceContactButtons[index].setAttribute('data-l10n-id',
         'ICESelectContact');
      }
    });
  }

  function goBack() {
    contacts.List.clearClickHandlers();
    contacts.List.handleClick(Contacts.showContactDetail);
    Contacts.setNormalHeader();

    var hasICESet = ICEData.iceContacts.find(function(x) {
      return x.active === true;
    });

    if (hasICESet) {
      contacts.List.toggleICEGroup(true);
    }

    if (contacts.Search && contacts.Search.isInSearchMode()) {
      contacts.Search.exitSearchMode();
    }

    contacts.Settings.navigation.back();
  }

  /**
   * Given a contact id, saves it internally. Also restores the contact
   * list default handler.
   * @param id (string) contact id
   */
  function selectICEHandler(id) {
    contacts.List.toggleICEGroup(true);
    setICEContact(id, currentICETarget, true, goBack);
  }

  /**
   * We are using the contact list to choose a contact as ICE. For doing
   * this, we need to setup our own click handler.
   * @para target (HTMLButton) Button click to select an ICE contact
   */
  function showSelectList(target) {
    contacts.List.toggleICEGroup(false);
    Contacts.setCanceleableHeader(goBack);
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
      setButtonsState(ICEData.iceContacts);

      if (typeof cb === 'function') {
        cb();
      }
    });
    
  }

  function reset() {
    iceScreenLoaded = false;
    iceContactItems = [];
    iceContactCheckboxes = [];
    iceContactButtons = [];
    currentICETarget = null;
  }

  return {
    init: init,
    reset: reset,
    get loaded() { return iceScreenLoaded; }
  };
})();
