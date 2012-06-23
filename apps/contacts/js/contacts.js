﻿'use strict';

function navigationStack(currentView) {
  var transitions = {
    'left-right': { from: 'view-left', to: 'view-right'},
    'top-bottom': { from: 'view-bottom', to: 'view-top'},
    'right-left': { from: 'view-right', to: 'view-left'},
    'bottom-top': { from: 'view-top', to: 'view-bottom'}
  };

  var _currentView = currentView;

  var stack = [];
  stack.push({ view: currentView, transition: ''});

  this.go = function(nextView, transition) {
    if (_currentView === nextView)
      return;

    var current = document.getElementById(_currentView);
    var next = document.getElementById(nextView);
    current.classList.add(transitions[transition].to);
    next.classList.remove(transitions[transition].from);

    stack.push({ view: _currentView, transition: transition});
    _currentView = nextView;
  };

  this.back = function() {
    if (stack.length < 2)
      return;

    var current = document.getElementById(_currentView);
    var nextView = stack.pop();
    var next = document.getElementById(nextView.view);
    current.classList.add(transitions[nextView.transition].from);
    next.classList.remove(transitions[nextView.transition].to);

    _currentView = nextView.view;
  };
}

var contacts = window.contacts || {};
contacts.app = (function() {
  // Pointers to Views ids
  var editView = 'view-contact-form';
  var contactDetailsView = 'view-contact-details';

  //Navigation stack
  var navigation = new navigationStack('view-contacts-list');

  //Initializations
  var numberEmails = 0;
  var numberPhones = 0;
  var detailsHeader,
      currentContactId,
      phoneDetailsTemplate,
      emailDetailsTemplate,
      detailsName,
      givenName,
      familyName,
      coverImg,
      formTitle,
      formActions,
      phoneTemplate,
      emailTemplate,
      phonesContainer,
      emailContainer;

  var currentContact = {};

  var contactsList = contacts.List;

  // Init selectors
  var init = function contactsInit() {
    detailsHeader = document.getElementById('details-view-header');
    currentContactId = document.getElementById('contact-form-id');
    givenName = document.getElementById('givenName');
    familyName = document.getElementById('familyName');
    detailsName = document.getElementById('contact-name-title');
    coverImg = document.getElementById('cover-img');
    formTitle = document.getElementById('contact-form-title');
    formActions = document.getElementById('contact-form-actions');
    phoneTemplate = document.getElementById('add-phone');
    emailTemplate = document.getElementById('add-email');
    phoneDetailsTemplate = document.getElementById('phone-details-template');
    emailDetailsTemplate = document.getElementById('email-details-template');
    phonesContainer = document.getElementById('contacts-form-phones');
    emailContainer = document.getElementById('contacts-form-email');

    var list = document.getElementById('groups-list');
    contactsList.init(list);
    contactsList.load();

    contactsList.handleClick(function onclick(contact) {
      currentContact = contact;
      doShowContactDetails(contact);
    });
  };

  var addNewPhone = function addNewPhone() {
    insertEmptyPhone(numberPhones);
    numberPhones++;
    return false;
  };

  var addNewEmail = function addNewEmail() {
    insertEmptyEmail(numberEmails);
    numberEmails++;
    return false;
  };

  //
  // Method that generates HTML markup for the contact
  //
  var doShowContactDetails = function doShowContactDetails(contact) {
    reloadContactDetails(contact);
    navigation.go(contactDetailsView, 'right-left');
  };

  var reloadContactDetails = function reloadContactDetails(contact) {
    detailsName.textContent = contact.name;
    var listContainer = document.getElementById('details-list');
    listContainer.innerHTML = '';
    for (var tel in contact.tel) {
      var telField = {
        number: contact.tel[tel].number,
        tel_type: '',
        notes: '',
        type: 'tel'
      };

      var template = utils.templates.render(phoneDetailsTemplate, telField);
      listContainer.appendChild(template);
    }

    for (var email in contact.email) {
      var emailField = {
        email: contact.email[email],
        email_tag: '', type: 'email'
      };
      var template = utils.templates.render(emailDetailsTemplate, emailField);
      listContainer.appendChild(template);
    }

    var photo = contact.photo || '';
    coverImg.style.backgroundImage = 'url(' + photo + ')';
  };

  var showEdit = function showEdit() {
    resetForm();
    formTitle.innerHTML = 'Edit contact';
    var editActions = [
      {
        label: 'Finish',
        icon: 'icon-finish',
        callback: saveContact
      }
    ];
    buildActions(editActions);
    currentContactId.value = currentContact.id;
    givenName.value = currentContact.givenName;
    familyName.value = currentContact.familyName;

    for (var tel in currentContact.tel) {
      var telField = {
        number: currentContact.tel[tel].number,
        type: '',
        notes: '',
        i: tel
      };

      var template = utils.templates.render(phoneTemplate, telField);
      phonesContainer.appendChild(template);
      numberPhones++;
    }

    for (var email in currentContact.email) {
      var emailField = {
        email: currentContact.email[email],
        type: '',
        i: email
      };

      var template = utils.templates.render(emailTemplate, emailField);
      emailContainer.appendChild(template);
      numberEmails++;
    }
    navigation.go(editView, 'right-left');
  };

  var showAdd = function showAdd() {
    resetForm();
    formTitle.innerHTML = 'Add Contact';
    insertEmptyPhone(0);
    insertEmptyEmail(0);
    buildActions([
      { label: 'Cancel', icon: 'icon-cancel', callback: navigation.back },
      { label: 'Finish', icon: 'icon-finish', callback: saveContact}
    ]);

    navigation.go(editView, 'right-left');
  };

  var saveContact = function saveContact(successCb, errorCb) {
    var form = document.querySelector('#view-contact-form form');
    var fields = document.querySelectorAll('#view-contact-form form input');
    var myContact = {};
    for (var i = 0; i < fields.length; i++) {
      var value = fields[i].value;
      if (value === '')
        continue;

      var name = fields[i].name;
      if (name === 'id') {
        myContact['id'] = value;
        continue;
      }

      myContact[name] = myContact[name] || [];
      var index = 0;
      if (fields[i].dataset.arrayindex) {
        // Array element
        var index = fields[i].dataset.arrayindex;
      }

      if (fields[i].dataset.field) {
        var field = fields[i].dataset.field;
        // Hash inside
        myContact[name][index] = myContact[name][index] || {};
        myContact[name][index][field] = value;
      } else {
        // No hash
        myContact[name][index] = myContact[name][index] || [];
        myContact[name][index] = value;
      }
    }

    var givenNameField = '' || myContact.givenName[0];
    var familyNameField = '' || myContact.familyName[0];
    myContact.name = givenNameField + ' ' + familyNameField;
    successCb = function(contact) {
      contactsList.refresh(contact);
      reloadContactDetails(contact);
      navigation.back();
    };

    errorCb = function() {
      console.error('Error saving contact');
    }

    var contact;
    if (myContact.id) {
      //Editing a contact
      for (field in myContact) {
        currentContact[field] = myContact[field];
      }
      contact = currentContact;
    } else {
      contact = new mozContact();
      contact.init(myContact);
    }

    doSaveContact(contact, successCb, errorCb);
  };

  var doSaveContact = function doSaveContact(contact, successCb, errorCb) {
    // TODO: VALIDATE FORM FIRST
    var request = navigator.mozContacts.save(contact);
    request.onsuccess = successCb(contact);
    request.onerror = errorCb;
  }

  var getContactById = function(contactID, successCb, errorCb) {
    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: contactID
    };

    var request = navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      if (request.result.length === 0)
        errorCb();

      successCb(request.result[0]);
     };

     request.onerror = errorCb;
  }

  var insertEmptyPhone = function insertEmptyPhone(index) {
    var telField = {
      number: '',
      type: '',
      notes: '',
      i: index
    };
    var template = utils.templates.render(phoneTemplate, telField);
    phonesContainer.appendChild(template);
  };

  var insertEmptyEmail = function insertEmptyEmail(index) {
    var emailField = {
      email: '',
      type: '',
      i: index
    };

    var template = utils.templates.render(emailTemplate, emailField);
    emailContainer.appendChild(template);
  };

  var buildActions = function(actions) {
    for (var i in actions) {
      var action = document.createElement('li');
      action.onclick = actions[i].callback;

      var link = document.createElement('a');
      link.title = actions[i].label;

      var icon = document.createElement('span');
      icon.setAttribute('role', 'button');
      icon.className = actions[i].icon;
      icon.innerHTML = actions[i].label;

      link.appendChild(icon);
      action.appendChild(link);
      formActions.appendChild(action);
    }
  };

  var resetForm = function() {
    formActions.innerHTML = '';
    currentContactId.value = '';
    givenName.value = '';
    familyName.value = '';
    var phones = document.getElementById('contacts-form-phones');
    var emails = document.getElementById('contacts-form-email');
    phones.innerHTML = '';
    emails.innerHTML = '';
    numberEmails = 0;
    numberPhones = 0;
  };

  var removeFieldIcon = function() {
    var delButton = document.createElement('button');
    delButton.className = 'fillflow-row-action';
    var delIcon = document.createElement('span');
    delIcon.setAttribute('role', 'button');
    delIcon.className = 'icon-delete';
    delButton.appendChild(delIcon);
    return delButton;
  };

  return {
    'init': init,
    'ui' : {
      'showEdit' : showEdit,
      'showAdd': showAdd,
      'addNewPhone' : addNewPhone,
      'addNewEmail' : addNewEmail,
      'goBack' : navigation.back
    }
  };
})();

window.addEventListener('load', function initContacts(evt) {
  window.removeEventListener('load', initContacts);
  contacts.app.init();
});

