'use strict';

var contacts = window.contacts || {};
contacts.api = navigator.mozContacts;

var navigationStack = (function(currentView) {
  var stack = new Array();
  var _currentView;
  var transitions = { 'left-right': { from: 'vw-left', to: 'vw-right'},
                      'top-bottom': { from: 'vw-bottom', to: 'vw-top'},
                      'right-left': { from: 'vw-right', to: 'vw-left'},
                      'bottom-top': { from: 'vw-top', to: 'vw-bottom'}
                    };

  _currentView = currentView;
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

});

if (!contacts.app) {

  contacts.app = (function() {
    // Pointers to Views ids
    var contactsListView = 'view-contacts-list';
    var editView = 'view-contact-form';
    var contactDetailsView = 'view-contact-details';

    //Navigation stack
    var navigation = new navigationStack('view-contacts-list');

    //Initializations
    var numberEmails = 0;
    var numberPhones = 0;
    var detailsHeader,
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

    var cList = contacts.List;

    // Init selectors
    var init = function contactsInit() {
      detailsHeader = document.getElementById('details-view-header');
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
      cList.init('groups-list');
      cList.load();
      cList.addEventListener('click', function(contact) {
        currentContact = contact;
        doShowContactDetails(contact);
      });
    };

    var goBack = function goBack() {
      navigation.back();
    };

    var addNewPhone = function addNewPhone() {
      numberPhones++;
      insertEmptyPhone(numberPhones);
      return false;
    };

    var addNewEmail = function addNewEmail() {
      numberEmails++;
      insertEmptyEmail(numberEmails);
      return false;
    };

    //
    // Method that generates HTML markup for the contact
    //

    var buildFavourites = function() {

    };

    var doShowContactDetails = function doShowContactDetails(contact) {
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
        var template = owd.templates.render(phoneDetailsTemplate, telField);
        listContainer.appendChild(template);
      }
      for (var email in contact.email) {
        var emailField = {
          email: contact.email[email],
          email_tag: '', type: 'email'
        };
        var template = owd.templates.render(emailDetailsTemplate, emailField);
        listContainer.appendChild(template);
      }
      owd.templates.append(coverImg, contact);
      navigation.go(contactDetailsView, 'right-left');
    };

    var showEdit = function showEdit() {
      resetForm();
      formTitle.innerHTML = 'Edit contact';
      buildActions([{label: 'Finish', icon: 'i-finish'}]);
      givenName.value = currentContact.givenName;
      familyName.value = currentContact.familyName;
      for (var tel in currentContact.tel) {
        var telField = {
          number: currentContact.tel[tel].number,
          type: '',
          notes: '',
          i: tel
        };
        var template = owd.templates.render(phoneTemplate, telField);
        phonesContainer.appendChild(template);
      }
      for (var email in currentContact.email) {
        var emailField = {
          email: currentContact.email[email],
          type: '',
          i: email
        };
        var template = owd.templates.render(emailTemplate, emailField);
        emailContainer.appendChild(template);
      }
      navigation.go(editView, 'right-left');
    };

    var showAdd = function showAdd() {
      resetForm();
      formTitle.innerHTML = 'Add Contact';
      insertEmptyPhone(0);
      insertEmptyEmail(0);
      buildActions([
        { label: 'Cancel', icon: 'i-cancel', callback: navigation.back },
        { label: 'Finish', icon: 'i-finish', callback: saveContact}
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
      var givenName = '' || myContact.givenName[0];
      var familyName = '' || myContact.familyName[0];
      myContact.name = givenName + ' ' + familyName;

      doSaveContact(myContact, function(contact) {
        cList.addContact(contact.id);
        navigation.back();
      }, function errorCb() {
        console.error('Error saving contact');
      });
    };

    var doSaveContact = function doSaveContact(myContact, successCb, errorCb) {
      // TODO: VALIDATE FORM FIRST
      var contact = new mozContact();
      contact.init(myContact);
      var request = navigator.mozContacts.save(contact);
      request.onsuccess = successCb(contact);
      request.onerror = errorCb;
    }

    var insertEmptyPhone = function insertEmptyPhone(index) {
      var telField = {
        number: '',
        type: '',
        notes: '',
        i: index
      };
      var template = owd.templates.render(phoneTemplate, telField);
      phonesContainer.appendChild(template);
    };

    var insertEmptyEmail = function insertEmptyEmail(index) {
      var emailField = {
        email: '',
        type: '',
        i: index
      };
      var template = owd.templates.render(emailTemplate, emailField);
      emailContainer.appendChild(template);
    };

    var buildActions = function(actions) {
      for (var i in actions) {
        var action = document.createElement('li');
        action.onclick = actions[i].callback;
        var link = document.createElement('a');
        link.title = actions[i].label;
        var icon = document.createElement('i');
        icon.className = actions[i].icon;
        icon.innerHTML = actions[i].label;
        link.appendChild(icon);
        action.appendChild(link);
        formActions.appendChild(action);
      }
    };

    var resetForm = function() {
      formActions.innerHTML = '';
      givenName.value = '';
      familyName.value = '';
      var phones = document.getElementById('contacts-form-phones');
      var emails = document.getElementById('contacts-form-email');
      phones.innerHTML = '';
      emails.innerHTML = '';
    };

    var removeFieldIcon = function() {
      var delButton = document.createElement('button');
      delButton.className = 'ff-row-action';
      var delIcon = document.createElement('i');
      delIcon.className = 'i-delete';
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
        'goBack' : goBack
      }
    };
  })();
}

window.addEventListener('load', function initIMEManager(evt) {
  window.removeEventListener('load', initIMEManager);
  contacts.app.init();
});
