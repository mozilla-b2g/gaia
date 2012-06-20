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
    var contactsListView,
        contactDetailsView,
        contactName,
        givenName,
        familyName,
        coverImg,
        editView,
        navigation,
        formTitle,
        formActions,
        phoneTemplate,
        emailTemplate,
        phonesContainer,
        emailContainer,
        numberPhones,
        numberEmails;

    var currentContact = {};

    var cList = contacts.List;

    // Init selectors
    var init = function contacts_init() {
      contactsListView = 'view-contacts-list';
      editView = 'view-contact-form';
      contactDetailsView = 'view-contact-details';
      contactName = document.getElementById('contact-name-title');
      coverImg = document.getElementById('cover-img');
      formTitle = document.getElementById('contact-form-title');
      formActions = document.getElementById('contact-form-actions');
      phoneTemplate = document.getElementById('add-phone');
      emailTemplate = document.getElementById('add-email');
      phonesContainer = document.getElementById('contacts-form-phones');
      emailContainer = document.getElementById('contacts-form-email');
      navigation = new navigationStack('view-contacts-list');
      givenName = document.getElementById('givenName');
      familyName = document.getElementById('familyName');
      cList.init('groups-list');
      cList.load();
      cList.addEventListener('click', function(contact) {
        console.log('Contact clicked: ' + contact.id);
        currentContact = contact;
        doShowContactDetails(contact);
      });
      numberEmails = 0;
      numberPhones = 0;
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
      contactName.innerHTML = contact.name;

      var listContainer = document.getElementById('details-list');
      for (var tel in contact.tel) {
        var telField = {number: contact.tel[tel].number, tel_type: '', notes: '', type: 'tel'};
        owd.templates.append(listContainer, telField);
      }
      for (var email in contact.email) {
        var emailField = {email: contact.email[email], email_tag: '', type: 'email'};
        owd.templates.append(listContainer, emailField);
      }
      owd.templates.append(coverImg, contact);
      navigation.go(contactDetailsView, 'right-left');
    };

    var showEdit = function showEdit() {
      resetForm();
      formTitle = 'Edit contact';
      buildActions([{label: 'Finish', icon: 'i-finish'}]);

      for (var tel in currentContact.tel) {
        var telField = {number: currentContact.tel[tel].number, type: '', notes: '', i: tel};
        phonesContainer.appendChild(owd.templates.render(phoneTemplate, telField));
      }
      for (var email in currentContact.email) {
        var emailField = {email: currentContact.email[email], type: '', i: email};
        emailContainer.appendChild(owd.templates.render(emailTemplate, emailField));
      }
      navigation.go(editView, 'right-left');
    };

    var showAdd = function showAdd() {
      resetForm();
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
        if(value === "")
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
      doSaveContact(myContact, function() {
        navigation.back();
      }, function errorCb() {
        console.error("Error saving contact");
      });
    };
    
    var doSaveContact = function doSaveContact(myContact, successCb, errorCb) {
      // TODO: VALIDATE FORM FIRST
      var contact = new mozContact();
      contact.init(myContact);
      var request = navigator.mozContacts.save(contact);
      request.onsuccess = successCb;
      request.onerror = errorCb;
    }

    var insertEmptyPhone = function insertEmptyPhone(index) {
      var telField = {number: '', type: '', notes: '', i: index};
      phonesContainer.appendChild(owd.templates.render(phoneTemplate, telField));
    };

    var insertEmptyEmail = function insertEmptyEmail(index) {
      var emailField = {email: '', type: '', i: index};
      emailContainer.appendChild(owd.templates.render(emailTemplate, emailField));
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

    var buildFormRow = function(label, id, type, value) {
      var row = document.createElement('p');
      row.className = 'ff-row';

      var labelElem = document.createElement('label');
      labelElem.className = 'hide';
      labelElem.for = id;
      labelElem.innerHTML = label;
      row.appendChild(labelElem);

      var input = document.createElement('input');
      input.className = 'textfield';
      input.type = type;
      if (value)
        input.value = value;
      input.id = id;
      row.appendChild(input);

      return row;
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
