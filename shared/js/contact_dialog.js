'use strict';
/*
 * This code has been abstracted out from dialer recents.js so
 * that it can be used both by dialer as well as sms apps whenever
 * user clicks on a phone number either in recent Call list or
 * in an SMS message
 */
var ContactDialog = {
  _l10n: navigator.mozL10n,

  get addContactActionMenu() {
    delete this.addContactActionMenu;
    return this.addContactActionMenu =
      document.getElementById('add-contact-action-menu');
  },

  get iframeContacts() {
    delete this.iframeContacts;
    return this.iframeContacts = document.
      getElementById('iframe-contacts');
  },

  get callMenuItem() {
    delete this.callMenuItem;
    return this.callMenuItem =
      document.getElementById('call-menuitem');
  },

  get createNewContactMenuItem() {
    delete this.createNewContactMenuItem;
    return this.createNewContactMenuItem =
      document.getElementById('create-new-contact-menuitem');
  },

  get addToExistingContactMenuItem() {
    delete this.addToExistingContactMenuItem;
    return this.addToExistingContactMenuItem =
      document.getElementById('add-to-existing-contact-menuitem');
  },

  get cancelActionMenuItem() {
    delete this.cancelActionMenuItem;
    return this.cancelActionMenuItem =
      document.getElementById('cancel-action-menu');
  },

  addContactDialogHTML: function sc_addContactDialog() {
    var fragment = document.createDocumentFragment();
    var dialogForm = document.createElement('form');
    dialogForm.id = 'add-contact-action-menu';
    dialogForm.setAttribute('role', 'dialog');
    dialogForm.setAttribute('data-type', 'action');
    dialogForm.classList.add('hidden');

    var header = document.createElement('header');
    this.headerText = document.createTextNode('');
    header.appendChild(this.headerText);

    var menu = document.createElement('menu');
    var button1 = document.createElement('button');
    button1.id = 'call-menuitem';
    button1.setAttribute('data-l10n-id', 'call');
    var button1Text = document.createTextNode(this._l10n.get('call'));
    button1.appendChild(button1Text);

    var button2 = document.createElement('button');
    button2.id = 'create-new-contact-menuitem';
    button2.setAttribute('data-l10n-id', 'createNewContact');
    var button2Text = document.createTextNode(
      this._l10n.get('createNewContact'));
    button2.appendChild(button2Text);

    var button3 = document.createElement('button');
    button3.id = 'add-to-existing-contact-menuitem';
    button3.setAttribute('data-l10n-id', 'addToExistingContact');
    var button3Text = document.createTextNode(
      this._l10n.get('addToExistingContact'));
    button3.appendChild(button3Text);

    var button4 = document.createElement('button');
    button4.id = 'cancel-action-menu';
    button4.setAttribute('data-l10n-id', 'cancel');
    var button4Text = document.createTextNode('Cancel');
    button4.appendChild(button4Text);

    menu.appendChild(button1);
    menu.appendChild(button2);
    menu.appendChild(button3);
    menu.appendChild(button4);
    dialogForm.appendChild(header);
    dialogForm.appendChild(menu);
    document.body.appendChild(dialogForm);
  },

  init: function sc_init() {
    this.addContactDialogHTML();

    if (this.callMenuItem) {
     this.callMenuItem.addEventListener('click',
       this.call.bind(this));
    }

    if (this.addContactActionMenu) {
      this.addContactActionMenu.addEventListener('submit',
        this.formSubmit.bind(this));
    }

    if (this.createNewContactMenuItem) {
      this.createNewContactMenuItem.addEventListener('click',
        this.createNewContact.bind(this));
    }
    if (this.addToExistingContactMenuItem) {
      this.addToExistingContactMenuItem.addEventListener('click',
        this.addToExistingContact.bind(this));
    }
    if (this.cancelActionMenuItem) {
      this.cancelActionMenuItem.addEventListener('click',
        this.cancelActionMenu.bind(this));
    }
  },

  formSubmit: function formSubmit(event) {
    return false;
  },

  createNewContact: function sc_createNewContact() {
    this.addContactActionMenu.classList.remove('visible');
    try {

      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': this.newPhoneNumber
          }
        }
      });
      activity.onsuccess = function contactCreated() {
      };
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  addToExistingContact: function sc_addToExistingContact() {

    this.addContactActionMenu.classList.remove('visible');

    try {
      var activity = new MozActivity({
        name: 'update',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': this.newPhoneNumber
          }
        }
      });
      activity.onsuccess = function contactAdded() {
      };
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }

  },

  call: function sc_call() {
    this.addContactActionMenu.classList.remove('visible');
    try {
      var activity = new MozActivity({
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: this.newPhoneNumber
        }
      });
      activity.onsuccess = function callFinished() {
      };

    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
    this.addContactActionMenu.classList.remove('visible');
  },

  cancelActionMenu: function sc_cancelActionMenu() {
    this.addContactActionMenu.classList.remove('visible');
  },
  showContactDialog: function sc_addPhone(phoneNumber) {
    this.newPhoneNumber = phoneNumber;
    this.addContactActionMenu.classList.add('visible');
    this.headerText.nodeValue = phoneNumber;
  }
};
