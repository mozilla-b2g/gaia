/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimFdnLock = {
  dialog: document.getElementById('call-pin2-dialog'),
  pinDialog: null,

  // enable|disable|unlock FDN
  simFdnDesc: document.querySelector('#fdn-enabled small'),
  simFdnCheckBox: document.querySelector('#fdn-enabled input'),
  resetPin2Item: document.getElementById('fdn-resetPIN2'),
  resetPin2Button: document.querySelector('#fdn-resetPIN2 button'),

  // FDN contact list (display, add)
  contactsContainer: document.getElementById('fdn-contactsContainer'),
  fdnContactTitle: document.getElementById('fdnContact-title'),
  fdnContactName: document.getElementById('fdnContact-name'),
  fdnContactNumber: document.getElementById('fdnContact-number'),
  fdnContactSubmit: document.getElementById('fdnContact-submit'),
  fdnContactButton: document.getElementById('fdnContact'),

  // FDN contact action menu (call, edit, delete)
  fdnActionMenu: document.getElementById('call-fdnList-action'),
  fdnActionMenuName: document.getElementById('fdnAction-name'),
  fdnActionMenuNumber: document.getElementById('fdnAction-number'),
  fdnActionMenuCall: document.getElementById('fdnAction-call'),
  fdnActionMenuEdit: document.getElementById('fdnAction-edit'),
  fdnActionMenuRemove: document.getElementById('fdnAction-delete'),
  fdnActionMenuCancel: document.getElementById('fdnAction-cancel'),
  currentContact: null,

  updateFdnStatus: function spl_updateSimStatus() {
    if (!IccHelper) {
      return;
    }
    var self = this;
    var req = IccHelper.getCardLock('fdn');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      localize(self.simFdnDesc, enabled ? 'enabled' : 'disabled');
      self.simFdnCheckBox.disabled = false;
      self.simFdnCheckBox.checked = enabled;
      self.resetPin2Item.hidden = !enabled;
    };
  },

  init: function spl_init() {
    if (!IccHelper) {
      return;
    }

    var callback = this.updateFdnStatus.bind(this);
    IccHelper.addEventListener('cardstatechange', callback);

    this.pinDialog = new SimPinDialog(this.dialog);
    var self = this;

    // enable|disable|unlock FDN

    this.simFdnCheckBox.disabled = true;
    this.simFdnCheckBox.onchange = function spl_togglePin2() {
      var action = this.checked ? 'enable_fdn' : 'disable_fdn';
      if (IccHelper.cardState === 'puk2Required') {
        action = 'unlock_puk2';
      }
      self.pinDialog.show(action, { onsuccess: callback, oncancel: callback });
    };

    this.resetPin2Button.onclick = function spl_resetPin2() {
      self.pinDialog.show('change_pin2');
    };

    this.updateFdnStatus();

    // add|edit|remove|call FDN contact

    window.addEventListener('panelready', (function(e) {
      if (e.detail.current === '#call-fdnList') {
        this.renderAuthorizedNumbers();
      }
    }).bind(this));

    var checkContactInputs = function() {
      self.fdnContactSubmit.disabled = !self.fdnContactNumber.value;
    };
    this.fdnContactNumber.oninput = checkContactInputs;

    this.fdnContactButton.onclick = function() { // add FDN contact
      localize(self.fdnContactTitle, 'fdnAction-add');
      self.fdnContactName.value = '';
      self.fdnContactNumber.value = '';
      self.fdnContactSubmit.onclick = function addContact() {
        self.updateContact('add');
      };
      checkContactInputs();
      Settings.currentPanel = '#call-fdnList-add';
    };

    this.fdnActionMenuEdit.onclick = function() { // edit FDN contact
      localize(self.fdnContactTitle, 'fdnAction-edit-header');
      self.fdnContactName.value = self.currentContact.name;
      self.fdnContactNumber.value = self.currentContact.number;
      self.fdnContactSubmit.onclick = function editContact() {
        self.updateContact('edit');
      };
      self.hideActionMenu();
      checkContactInputs();
      Settings.currentPanel = '#call-fdnList-add';
    };

    this.fdnActionMenuRemove.onclick = function() { // remove FDN contact
      self.hideActionMenu();
      self.updateContact('remove');
    };

    this.fdnActionMenuCall.onclick = function() {
      new MozActivity({
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: self.currentContact.number
        }
      });
    };

    this.fdnActionMenuCancel.onclick = this.hideActionMenu.bind(this);
  },


  /**
   * Display FDN contact list and action menu
   */

  renderFdnContact: function(contact) {
    var li = document.createElement('li');
    var nameContainer = document.createElement('span');
    var numberContainer = document.createElement('small');

    nameContainer.textContent = contact.name;
    numberContainer.textContent = contact.number;
    li.appendChild(numberContainer);
    li.appendChild(nameContainer);

    li.onclick = (function() {
      this.showActionMenu(contact);
    }).bind(this);
    return li;
  },

  renderAuthorizedNumbers: function() {
    this.contactsContainer.innerHTML = '';
    FdnAuthorizedNumbers.getContacts(null, (function(contacts) {
      for (var i = 0, l = contacts.length; i < l; i++) {
        var li = this.renderFdnContact(contacts[i]);
        this.contactsContainer.appendChild(li);
      }
    }).bind(this));
  },

  showActionMenu: function(contact) {
    this.currentContact = contact;
    this.fdnActionMenuName.textContent = contact.name;
    this.fdnActionMenuNumber.textContent = contact.number;
    this.fdnActionMenu.hidden = false;
  },

  hideActionMenu: function() {
    this.fdnActionMenu.hidden = true;
  },


  /**
   * Add|Edit|Remove FDN contact
   */

  updateContact: function(action) {
    // `action' is either `add', `edit' or `remove': these three actions all
    // rely on the same mozIccManager.updateContact() method.

    var contact = FdnAuthorizedNumbers.getContactInfo(action, {
      id: this.currentContact && this.currentContact.id,
      name: this.fdnContactName.value,
      number: this.fdnContactNumber.value
    });

    var clear = function() {
      // Warning, the panel navigation is like this:
      //   FDN list -> FDN add/edit contact -> PIN2 dialog -> FDN list
      // so we have to make sure the FDN add/edit panel has no 'previous' class.
      document.querySelector('#call-fdnList-add').className = '';
      this.fdnContactName.value = '';
      this.fdnContactNumber.value = '';
    };

    this.pinDialog.show('get_pin2', {
      exitPanel: '#call-fdnList',
      onsuccess: clear.bind(this),
      oncancel: clear.bind(this),
      fdnContact: contact
    });
  }
};

navigator.mozL10n.ready(SimFdnLock.init.bind(SimFdnLock));

