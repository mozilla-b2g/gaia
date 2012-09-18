'use strict';

var contacts = window.contacts || {};

contacts.Form = (function() {

  var numberEmails = 0;
  var numberPhones = 0;
  var numberAddresses = 0;
  var numberNotes = 0;
  var dom,
      deleteContactButton,
      thumb,
      thumbAction,
      saveButton,
      formTitle,
      currentContactId,
      givenName,
      company,
      familyName;

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
  }

  var init = function cf_init(currentDom) {
    dom = currentDom || document;
    initContainers();

    document.addEventListener('input', function input(event) {
      checkDisableButton();
    });

    // When the cancel button inside the input is clicked
    document.addEventListener('cancelInput', function() {
      checkDisableButton();
    });

  };

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

  var render = function cf_render(contact, callback) {
    resetForm();
    contact ? showEdit(contact) : showAdd();
    if (callback) {
      callback();
    }
  };

  var showForm() {

  };
  var showEdit = function showEdit(currentContact) {
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
    updatePhoto(photo, thumb);

    // var default_type = TAG_OPTIONS['phone-type'][0].value;
    // var telLength = getLength(currentContact.tel);
    // for (var tel = 0; tel < telLength; tel++) {
    //   var currentTel = currentContact.tel[tel];
    //   var telField = {
    //     value: currentTel.value || '',
    //     type: currentTel.type || default_type,
    //     carrier: currentTel.carrier || '',
    //     i: tel
    //   };

    //   var template = utils.templates.render(phoneTemplate, telField);
    //   template.appendChild(removeFieldIcon(template.id));
    //   phonesContainer.appendChild(template);
    //   numberPhones++;
    // }

    // var emailLength = getLength(currentContact.email);
    // for (var email = 0; email < emailLength; email++) {
    //   var currentEmail = currentContact.email[email];
    //   var default_type = TAG_OPTIONS['email-type'][0].value;
    //   var emailField = {
    //     value: currentEmail['value'] || '',
    //     type: currentEmail['type'] || default_type,
    //     i: email
    //   };

    //   var template = utils.templates.render(emailTemplate, emailField);
    //   template.appendChild(removeFieldIcon(template.id));
    //   emailContainer.appendChild(template);
    //   numberEmails++;
    // }

    // if (currentContact.adr) {
    //   for (var adr = 0; adr < currentContact.adr.length; adr++) {
    //     var currentAddress = currentContact.adr[adr];
    //     if (isEmpty(currentAddress, ['streetAddress', 'postalCode',
    //       'locality', 'countryName'])) {
    //         continue;
    //     }
    //     var default_type = TAG_OPTIONS['address-type'][0].value;
    //     var adrField = {
    //       streetAddress: currentAddress['streetAddress'] || '',
    //       postalCode: currentAddress['postalCode'] || '',
    //       locality: currentAddress['locality'] || '',
    //       countryName: currentAddress['countryName'] || '',
    //       type: currentAddress['type'] || default_type,
    //       i: adr
    //     };

    //     var template = utils.templates.render(addressTemplate, adrField);
    //     template.appendChild(removeFieldIcon(template.id));
    //     addressContainer.appendChild(template);
    //     numberAddresses++;
    //   }
    // }
    // var noteLength = getLength(currentContact.note);
    // for (var i = 0; i < noteLength; i++) {
    //   var currentNote = currentContact.note[i];
    //   var noteField = {
    //     note: currentNote || '',
    //     i: i
    //   };
    //   var template = utils.templates.render(noteTemplate, noteField);
    //   template.appendChild(removeFieldIcon(template.id));
    //   noteContainer.appendChild(template);
    //   numberNotes++;
    // }

    // deleteContactButton.onclick = function deleteClicked(event) {
    //   var msg = _('deleteConfirmMsg');
    //   var yesObject = {
    //     title: _('remove'),
    //     callback: function onAccept() {
    //       deleteContact(currentContact);
    //       CustomDialog.hide();
    //     }
    //   };

    //   var noObject = {
    //     title: _('cancel'),
    //     callback: function onCancel() {
    //       CustomDialog.hide();
    //     }
    //   };

    //   CustomDialog.show(null, msg, noObject, yesObject);
    // };

    // edit();

    console.log('SHOW EDIT CALLED');
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
      navigation.home();
    };
    request.onerror = function errorDelete() {
      console.error('Error removing the contact');
    };
  };

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
    if (isEmpty(myContact, ['givenName', 'familyName', 'org', 'tel',
      'email', 'note', 'adr'])) {
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
        contactsList.refresh(myContact);
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postNewSuccess(myContact);
        } else {
          contactsDetails.render(currentContact, TAG_OPTIONS);
        }
        navigation.back();
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
  };

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
  };

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
  };

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
  };

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
  };

  var insertPhone = function insertPhone(phone) {
    var telField = {
      value: phone || '',
      type: TAG_OPTIONS['phone-type'][0].value,
      carrier: '',
      i: numberPhones || 0
    };
    var template = utils.templates.render(phoneTemplate, telField);
    template.appendChild(removeFieldIcon(template.id));
    phonesContainer.appendChild(template);
    numberPhones++;
  };

  var insertEmail = function insertEmail(email) {
    var emailField = {
      value: email || '',
      type: TAG_OPTIONS['email-type'][0].value,
      i: numberEmails || 0
    };

    var template = utils.templates.render(emailTemplate, emailField);
    template.appendChild(removeFieldIcon(template.id));
    emailContainer.appendChild(template);
    numberEmails++;
  };

  var insertAddress = function insertAddress(address) {
    var addressField = {
      type: TAG_OPTIONS['address-type'][0].value,
      streetAddress: address || '',
      postalCode: '',
      locality: '',
      countryName: '',
      i: numberAddresses || 0
    };

    var template = utils.templates.render(addressTemplate, addressField);
    template.appendChild(removeFieldIcon(template.id));
    addressContainer.appendChild(template);
    numberAddresses++;
  };

  var insertNote = function insertNote(note) {
    var noteField = {
      note: note || '',
      i: numberNotes || 0
    };

    var template = utils.templates.render(noteTemplate, noteField);
    template.appendChild(removeFieldIcon(template.id));
    noteContainer.appendChild(template);
    numberNotes++;
  };

  var resetForm = function resetForm() {
    thumbAction.querySelector('p').classList.remove('hide');
    saveButton.removeAttribute('disabled');
    currentContactId.value = '';
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
    numberEmails = 0;
    numberPhones = 0;
    numberAddresses = 0;
    numberNotes = 0;
  };

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
    'addNewPhone' : insertPhone,
    'addNewEmail' : insertEmail,
    'addNewAddress' : insertAddress,
    'addNewNote' : insertNote,
    'saveContact': saveContact
  }
})();
