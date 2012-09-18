'use strict';

var contacts = window.contacts || {};

contacts.Form = (function() {

  var counters = {
    'tel': 0,
    'email': 0,
    'adr': 0,
    'note': 0
  };
  var TAG_OPTIONS;
  var dom,
      deleteContactButton,
      thumb,
      thumbAction,
      saveButton,
      formTitle,
      currentContactId,
      givenName,
      company,
      familyName,
      configs,
      currentContact;

  var initContainers = function cf_initContainers() {
    deleteContactButton = dom.querySelector('#delete-contact');
    thumb = dom.querySelector('#thumbnail-photo');
    thumbAction = dom.querySelector('#thumbnail-action');
    saveButton = dom.querySelector('#save-button');
    formTitle = dom.getElementById('contact-form-title');
    currentContactId = dom.getElementById('contact-form-id');
    givenName = dom.getElementById('givenName');
    company = dom.getElementById('org');
    familyName = dom.getElementById('familyName');
    var phonesContainer = dom.getElementById('contacts-form-phones');
    var emailContainer = dom.getElementById('contacts-form-emails');
    var addressContainer = dom.getElementById('contacts-form-addresses');
    var noteContainer = dom.getElementById('contacts-form-notes');
    var phoneTemplate = dom.getElementById('add-phone-#i#');
    var emailTemplate = dom.getElementById('add-email-#i#');
    var addressTemplate = dom.getElementById('add-address-#i#');
    var noteTemplate = dom.getElementById('add-note-#i#');
    configs = {
      'tel': {
        template: phoneTemplate,
        tags: TAG_OPTIONS['phone-type'],
        fields: ['value', 'type', 'carrier'],
        container: phonesContainer
      },
      'email': {
        template: emailTemplate,
        tags: TAG_OPTIONS['email-type'],
        fields: ['value', 'type'],
        container: emailContainer
      },
      'adr': {
        template: addressTemplate,
        tags: TAG_OPTIONS['address-type'],
        fields: [
          'type',
          'streetAddress',
          'postalCode',
          'locality',
          'countryName'
        ],
        container: addressContainer
      },
      'note': {
        template: noteTemplate,
        tags: TAG_OPTIONS['address-type'],
        fields: ['note'],
        container: noteContainer
      }
    };
  }

  var init = function cf_init(tags, currentDom) {
    dom = currentDom || document;
    TAG_OPTIONS = tags;
    initContainers();

    document.addEventListener('input', function input(event) {
      checkDisableButton();
    });

    // When the cancel button inside the input is clicked
    document.addEventListener('cancelInput', function() {
      checkDisableButton();
    });

  };

  var render = function cf_render(contact, callback) {
    resetForm();
    contact ? showEdit(contact) : showAdd();
    if (callback) {
      callback();
    }
  };

  var showEdit = function showEdit(contact) {
    currentContact = contact;
    deleteContactButton.classList.remove('hide');
    formTitle.innerHTML = _('editContact');
    currentContactId.value = currentContact.id;
    givenName.value = currentContact.givenName;
    familyName.value = currentContact.familyName;
    company.value = currentContact.org;
    var photo = null;
    if (currentContact.photo && currentContact.photo.length > 0) {
      photo = currentContact.photo[0];
    }
    Contacts.updatePhoto(photo, thumb);
    var toRender = ['tel', 'email', 'adr', 'note'];
    for (var i = 0; i < toRender.length; i++) {
      var current = toRender[i];
      renderTemplate(current, currentContact[current]);
    }
    console.log('SHOW EDIT CALLED');
  };

  // template, fields, cont, counter
  var renderTemplate = function cf_rendTemplate(type, toRender) {
    var object = toRender || [];
    var objLength = object.length || 1;

    for (var i = 0; i < objLength; i++) {
      var currentObj = object[i] || {};
      insertField(type, currentObj);
    }
  }

  var insertField = function insertField(type, object) {
    var obj = object || {};
    var config = configs[type];
    var template = config['template'];
    var tags = config['tags'];
    var fields = config['fields'];
    var container = config['container'];

    var default_type = tags[0].value || '';
    var currField = {};
    for (var j = 0; j < fields.length; j++) {
      var currentElem = fields[j];
      var def = (currentElem === 'type') ? default_type : '';
      var defObj = (typeof(obj) === 'string') ? obj : obj[currentElem];
      currField[currentElem] = defObj || def;
    }
    currField['i'] = counters[type];
    var rendered = utils.templates.render(template, currField);
    rendered.appendChild(removeFieldIcon(rendered.id));
    container.appendChild(rendered);
    counters[type]++;
  };

  var showAdd = function showAdd(params) {
    console.log('SHOW ADD CALLED');
    // if (!params || params == -1 || !('id' in params)) {
    //   currentContact = {};
    // }
    // saveButton.setAttribute('disabled', 'disabled');
    // deleteContactButton.classList.add('hide');
    // formTitle.innerHTML = _('addContact');

    // params = params || {};

    // givenName.value = params.giveName || '';
    // familyName.value = params.lastName || '';
    // company.value = params.company || '';

    // var paramsMapping = {
    //   'tel' : insertPhone,
    //   'email' : insertEmail,
    //   'address' : insertAddress,
    //   'note' : insertNote
    // };
    // formTitle.innerHTML = _('addContact');

    // for (var i in paramsMapping) {
    //   paramsMapping[i].call(this, params[i] || 0);
    // }
    // contactsForm.checkDisableButton();
    // edit();
  };

  var deleteContact = function deleteContact(contact) {
    var request = navigator.mozContacts.remove(currentContact);
    request.onsuccess = function successDelete() {
      contactsList.remove(currentContact.id);
      currentContact = {};
      Contacts.navigation.home();
    };
    request.onerror = function errorDelete() {
      console.error('Error removing the contact');
    };
  }

  var saveContact = function saveContact() {
    saveButton.setAttribute('disabled', 'disabled');
    var myContact = {
      id: document.getElementById('contact-form-id').value,
      additionalName: '',
      name: ''
    };

    var inputs = {
      'givenName': givenName,
      'familyName': familyName,
      'org': company
    };

    for (field in inputs) {
      var value = inputs[field].value;
      if (value && value.length > 0) {
        myContact[field] = [value];
      } else {
        myContact[field] = null;
      }
    }

    var fields = ['photo', 'category'];

    for (var i = 0; i < fields.length; i++) {
      var currentField = fields[i];
      if (currentContact[currentField]) {
        myContact[currentField] = currentContact[currentField];
      }
    }

    if (myContact.givenName || myContact.familyName) {
      var name = myContact.givenName || '';
      name += ' ';
      if (myContact.familyName) {
        name += myContact.familyName;
      }
      myContact.name = [name];
    }

    getPhones(myContact);
    getEmails(myContact);
    getAddresses(myContact);
    getNotes(myContact);

    // Use the isEmpty function to check fields but address
    // and inspect address by it self.
    var fields = ['givenName', 'familyName', 'org', 'tel',
      'email', 'note', 'adr'];
    if (Contacts.isEmpty(myContact, fields)) {
      return;
    }

    var contact;
    if (myContact.id) { //Editing a contact
      currentContact.tel = [];
      currentContact.email = [];
      currentContact.adr = [];
      currentContact.note = [];
      currentContact.photo = [];
      var readOnly = ['id', 'updated', 'published'];
      for (var field in myContact) {
        if (readOnly.indexOf(field) == -1) {
          currentContact[field] = myContact[field];
        }
      }
      contact = currentContact;
    } else {
      contact = new mozContact();
      contact.init(myContact);
    }

    var request = navigator.mozContacts.save(contact);
    request.onsuccess = function onsuccess() {
      // Reloading contact, as it only allows to be updated once
      var cList = contacts.List;
      cList.getContactById(contact.id, function onSuccess(savedContact) {
        currentContact = savedContact;
        myContact.id = savedContact.id;
        myContact.photo = savedContact.photo;
        myContact.category = savedContact.category;
        cList.refresh(myContact);
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postNewSuccess(myContact);
        } else {
          contacts.Details.render(currentContact, TAG_OPTIONS);
        }
        Contacts.navigation.back();
      }, function onError() {
        console.error('Error reloading contact');
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postCancel();
        }
      });
    };

    request.onerror = function onerror() {
      console.error('Error saving contact');
    }
  }

  var getPhones = function getPhones(contact) {
    var selector = '#view-contact-form form div.phone-template';
    var phones = document.querySelectorAll(selector);
    for (var i = 0; i < phones.length; i++) {
      var currentPhone = phones[i];
      var arrayIndex = currentPhone.dataset.index;
      var numberField = document.getElementById('number_' + arrayIndex);
      var numberValue = numberField.value;
      if (!numberValue)
        continue;

      var selector = 'tel_type_' + arrayIndex;
      var typeField = document.getElementById(selector).textContent || '';
      var carrierSelector = 'carrier_' + arrayIndex;
      var carrierField = document.getElementById(carrierSelector).value || '';
      contact['tel'] = contact['tel'] || [];
      contact['tel'][i] = {
        value: numberValue,
        type: typeField,
        carrier: carrierField
      };
    }
  }

  var getEmails = function getEmails(contact) {
    var selector = '#view-contact-form form div.email-template';
    var emails = document.querySelectorAll(selector);
    for (var i = 0; i < emails.length; i++) {
      var currentEmail = emails[i];
      var arrayIndex = currentEmail.dataset.index;
      var emailField = document.getElementById('email_' + arrayIndex);
      var emailValue = emailField.value;
      var selector = 'email_type_' + arrayIndex;
      var typeField = document.getElementById(selector).textContent || '';
      if (!emailValue)
        continue;

      contact['email'] = contact['email'] || [];
      contact['email'][i] = {
        value: emailValue,
        type: typeField
      };
    }
  }

  var getAddresses = function getAddresses(contact) {
    var selector = '#view-contact-form form div.address-template';
    var addresses = document.querySelectorAll(selector);
    for (var i = 0; i < addresses.length; i++) {
      var currentAddress = addresses[i];
      var arrayIndex = currentAddress.dataset.index;
      var addressField = document.getElementById('streetAddress_' + arrayIndex);
      var addressValue = addressField.value || '';

      var selector = 'address_type_' + arrayIndex;
      var typeField = document.getElementById(selector).textContent || '';
      selector = 'locality_' + arrayIndex;
      var locality = document.getElementById(selector).value || '';
      selector = 'postalCode_' + arrayIndex;
      var postalCode = document.getElementById(selector).value || '';
      selector = 'countryName_' + arrayIndex;
      var countryName = document.getElementById(selector).value || '';

      // Sanity check for pameters, check all params but the typeField
      if (addressValue == '' && locality == '' &&
          postalCode == '' && countryName == '') {
        continue;
      }

      contact['adr'] = contact['adr'] || [];
      contact['adr'][i] = {
        streetAddress: addressValue,
        postalCode: postalCode,
        locality: locality,
        countryName: countryName,
        type: typeField
      };
    }
  }

  var getNotes = function getNotes(contact) {
    var selector = '#view-contact-form form div.note-template';
    var notes = document.querySelectorAll(selector);
    for (var i = 0; i < notes.length; i++) {
      var currentNote = notes[i];
      var arrayIndex = currentNote.dataset.index;
      var noteField = document.getElementById('note_' + arrayIndex);
      var noteValue = noteField.value;
      if (!noteValue) {
        continue;
      }

      contact['note'] = contact['note'] || [];
      contact['note'].push(noteValue);
    }
  }

  var resetForm = function resetForm() {
    thumbAction.querySelector('p').classList.remove('hide');
    saveButton.removeAttribute('disabled');
    currentContactId.value = '';
    currentContact = null;
    givenName.value = '';
    familyName.value = '';
    company.value = '';
    thumb.style.backgroundImage = '';
    var phones = document.getElementById('contacts-form-phones');
    var emails = document.getElementById('contacts-form-emails');
    var addresses = document.getElementById('contacts-form-addresses');
    var notes = document.getElementById('contacts-form-notes');
    phones.innerHTML = '';
    emails.innerHTML = '';
    addresses.innerHTML = '';
    notes.innerHTML = '';
    counters = {
      'tel': 0,
      'email': 0,
      'adr': 0,
      'note': 0
    };
  }

  var checkDisableButton = function checkDisable() {
    var saveButton = dom.getElementById('save-button');
    if (emptyForm('contact-form')) {
      saveButton.setAttribute('disabled', 'disabled');
    } else {
      saveButton.removeAttribute('disabled');
    }
  };

  var emptyForm = function emptyForm(id) {
    var form = dom.getElementById(id);
    var inputs = form.querySelectorAll('input.textfield');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value != '')
        return false;
    }
    return true;
  }

  var removeFieldIcon = function removeFieldIcon(selector) {
    var delButton = document.createElement('button');
    delButton.className = 'fillflow-row-action';
    var delIcon = document.createElement('span');
    delIcon.setAttribute('role', 'button');
    delIcon.className = 'icon-delete';
    delButton.appendChild(delIcon);
    delButton.onclick = function removeElement(event) {
      event.preventDefault();
      var elem = document.getElementById(selector);
      elem.parentNode.removeChild(elem);
      checkDisableButton();
      return false;
    };
    return delButton;
  };

  return {
    'init': init,
    'render': render,
    'checkDisableButton': checkDisableButton,
    'insertField': insertField,
    'saveContact': saveContact
  };
})();
