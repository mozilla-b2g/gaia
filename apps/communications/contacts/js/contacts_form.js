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
  var currentContact = {};
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
      _;

  var initContainers = function cf_initContainers() {
    deleteContactButton = dom.querySelector('#delete-contact');
    thumb = dom.querySelector('#thumbnail-photo');
    thumbAction = dom.querySelector('#thumbnail-action');
    thumbAction.addEventListener('mousedown', onThumbMouseDown);
    thumbAction.addEventListener('mouseup', onThumbMouseUp);
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
    _ = navigator.mozL10n.get;
    initContainers();

    dom.addEventListener('input', function input(event) {
      checkDisableButton();
    });

    // When the cancel button inside the input is clicked
    dom.addEventListener('cancelInput', function() {
      checkDisableButton();
    });

  };

  var render = function cf_render(contact, callback) {
    resetForm();
    (contact && contact.id) ? showEdit(contact) : showAdd(contact);
    if (callback) {
      callback();
    }
  };

  var showEdit = function showEdit(contact) {
    if (!contact || !contact.id) {
      return;
    }
    currentContact = contact;
    deleteContactButton.classList.remove('hide');
    formTitle.innerHTML = _('editContact');
    currentContactId.value = contact.id;
    givenName.value = contact.givenName || '';
    familyName.value = contact.familyName || '';
    company.value = contact.org || '';
    var photo = null;
    if (contact.photo && contact.photo.length > 0) {
      photo = contact.photo[0];
    }
    Contacts.updatePhoto(photo, thumb);
    var toRender = ['tel', 'email', 'adr', 'note'];
    for (var i = 0; i < toRender.length; i++) {
      var current = toRender[i];
      renderTemplate(current, contact[current]);
    }
    deleteContactButton.onclick = function deleteClicked(event) {
      var msg = _('deleteConfirmMsg');
      var yesObject = {
        title: _('remove'),
        callback: function onAccept() {
          deleteContact(currentContact);
          CustomDialog.hide();
        }
      };

      var noObject = {
        title: _('cancel'),
        callback: function onCancel() {
          CustomDialog.hide();
        }
      };

      CustomDialog.show(null, msg, noObject, yesObject);
    };
  };

  var showAdd = function showAdd(params) {
    if (!params || params == -1 || !('id' in params)) {
      currentContact = {};
    }
    saveButton.setAttribute('disabled', 'disabled');
    deleteContactButton.classList.add('hide');
    formTitle.innerHTML = _('addContact');

    params = params || {};

    givenName.value = params.giveName || '';
    familyName.value = params.lastName || '';
    company.value = params.company || '';

    var toRender = ['tel', 'email', 'adr', 'note'];
    for (var i = 0; i < toRender.length; i++) {
      var current = toRender[i];
      var rParams = params[current] || '';
      renderTemplate(current, [{value: rParams}]);
    }
    checkDisableButton();
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
    if (!type || !configs[type]) {
      console.error('Inserting field with unknown type');
      return;
    }
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

  var deleteContact = function deleteContact(contact) {
    var request = navigator.mozContacts.remove(contact);
    request.onsuccess = function successDelete() {
      contacts.List.remove(contact.id);
      Contacts.setCurrent({});
      Contacts.navigation.home();
    };
    request.onerror = function errorDelete() {
      console.error('Error removing the contact');
    };
  }

  var saveContact = function saveContact() {
    currentContact = currentContact || {};
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
        Contacts.setCurrent(savedContact);
        myContact.id = savedContact.id;
        myContact.photo = savedContact.photo;
        myContact.category = savedContact.category;
        cList.refresh(myContact);
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postNewSuccess(savedContact);
        } else {
          contacts.Details.render(savedContact, TAG_OPTIONS);
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
    var phones = dom.querySelectorAll(selector);
    for (var i = 0; i < phones.length; i++) {
      var currentPhone = phones[i];
      var arrayIndex = currentPhone.dataset.index;
      var numberField = dom.getElementById('number_' + arrayIndex);
      var numberValue = numberField.value;
      if (!numberValue)
        continue;

      var selector = 'tel_type_' + arrayIndex;
      var typeField = dom.getElementById(selector).textContent || '';
      var carrierSelector = 'carrier_' + arrayIndex;
      var carrierField = dom.getElementById(carrierSelector).value || '';
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
    var emails = dom.querySelectorAll(selector);
    for (var i = 0; i < emails.length; i++) {
      var currentEmail = emails[i];
      var arrayIndex = currentEmail.dataset.index;
      var emailField = dom.getElementById('email_' + arrayIndex);
      var emailValue = emailField.value;
      var selector = 'email_type_' + arrayIndex;
      var typeField = dom.getElementById(selector).textContent || '';
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
    var addresses = dom.querySelectorAll(selector);
    for (var i = 0; i < addresses.length; i++) {
      var currentAddress = addresses[i];
      var arrayIndex = currentAddress.dataset.index;
      var addressField = dom.getElementById('streetAddress_' + arrayIndex);
      var addressValue = addressField.value || '';

      var selector = 'address_type_' + arrayIndex;
      var typeField = dom.getElementById(selector).textContent || '';
      selector = 'locality_' + arrayIndex;
      var locality = dom.getElementById(selector).value || '';
      selector = 'postalCode_' + arrayIndex;
      var postalCode = dom.getElementById(selector).value || '';
      selector = 'countryName_' + arrayIndex;
      var countryName = dom.getElementById(selector).value || '';

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
    var notes = dom.querySelectorAll(selector);
    for (var i = 0; i < notes.length; i++) {
      var currentNote = notes[i];
      var arrayIndex = currentNote.dataset.index;
      var noteField = dom.getElementById('note_' + arrayIndex);
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
    var phones = dom.querySelector('#contacts-form-phones');
    var emails = dom.querySelector('#contacts-form-emails');
    var addresses = dom.querySelector('#contacts-form-addresses');
    var notes = dom.querySelector('#contacts-form-notes');
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

  var onThumbMouseDown = function onThumbMouseDown(evt) {
    var self = this;
    this.longPress = false;
    this._pickImageTimer = setTimeout(function(self) {
      self.longPress = true;
      if (currentContact && currentContact.photo &&
        currentContact.photo.length > 0) {
        removePhoto();
      }
    }, 500, this);
  };

  var onThumbMouseUp = function onThumbMouseUp(evt) {
    if (!this.longPress || !currentContact ||
       !currentContact.hasOwnProperty('photo') ||
       currentContact.photo == null ||
       currentContact.photo.length == 0) {
      pickImage();
    }

    clearTimeout(this._pickImageTimer);
  }

  var removePhoto = function() {
    var dismiss = {
      title: _('cancel'),
      callback: CustomDialog.hide
    };
    var remove = {
      title: _('ok'),
      callback: function() {
        currentContact.photo = [];
        Contacts.updatePhoto(null, thumb);
        CustomDialog.hide();
      }
    };
    CustomDialog.show('', _('removePhotoConfirm'), dismiss, remove);
  }

  var updateContactPhoto = function updateContactPhoto(image) {
    if (!navigator.getDeviceStorage) {
      console.log('Device storage unavailable');
      return;
    }
    var storageAreas = navigator.getDeviceStorage('pictures');
    var storage = storageAreas[0] || storageAreas;
    var request = storage.get(image);
    request.onsuccess = function() {
      var img = document.createElement('img');
      var imgSrc = URL.createObjectURL(request.result);
      img.src = imgSrc;
      this.img = img;
      img.onload = function() {
        var dataImg = getPhoto(this.img);
        Contacts.updatePhoto(dataImg, thumb);
        currentContact.photo = currentContact.photo || [];
        currentContact.photo[0] = dataImg;
      }.bind(this);
    };
    request.onerror = function() {
      console.log('Error loading img');
    };
  }

  var getPhoto = function getContactImg(contactImg) {
    // Checking whether the image was actually loaded or not
    var canvas = document.createElement('canvas');
    var ratio = 2.5;
    canvas.width = thumb.width * ratio;
    canvas.height = thumb.height * ratio;
    var ctx = canvas.getContext('2d');
    var widthBigger = contactImg.width > contactImg.height;
    var toCut = widthBigger ? 'width' : 'height';
    var toScale = widthBigger ? 'height' : 'width';
    var scaled = contactImg[toScale] / canvas[toScale];
    var scaleValue = 1 / scaled;
    ctx.scale(scaleValue, scaleValue);
    var margin = ((contactImg[toCut] / scaled) - canvas[toCut]) / 2;

    if (widthBigger) {
      ctx.drawImage(contactImg, -margin, 0);
    } else {
      ctx.drawImage(contactImg, 0, -margin);
    }
    var filename = 'contact_' + new Date().getTime();
    var ret = canvas.mozGetAsFile(filename);
    contactImg = null;
    canvas = null;
    return ret;
  }

  var pickImage = function pickImage() {
    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg'
      }
    });

    var reopenApp = function reopen() {
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        var app = evt.target.result;
        var ep = window == top ? 'contacts' : 'dialer';
        app.launch(ep);
      };
    };

    activity.onsuccess = function success() {
      reopenApp();
      var currentImg = this.result.filename;
      updateContactPhoto(currentImg);
    }

    activity.onerror = function error() {
      reopenApp();
    }
  };

  return {
    'init': init,
    'render': render,
    'insertField': insertField,
    'saveContact': saveContact,
    'pickImage': pickImage
  };
})();
