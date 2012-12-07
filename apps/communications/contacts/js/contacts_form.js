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
      _,
      formView,
      nonEditableValues,
      deviceContact,
      currentPhoto;

  var REMOVED_CLASS = 'removed';
  var FB_CLASS = 'facebook';

  // Remove icon button id
  var IMG_DELETE_ID = 'img-delete-button';

  // The size we want our contact photos to be
  var PHOTO_WIDTH = 320;
  var PHOTO_HEIGHT = 320;

  var textFieldsCache = {
    _textFields: null,

    get: function textFieldsCache_get() {
      if (!this._textFields) {
        var form = dom.getElementById('contact-form');
        var fields = form.querySelectorAll('input.textfield');
        var removedFields =
          Array.slice(form.querySelectorAll('.removed input.textfield'));
        this._textFields = Array.filter(fields, function(field) {
          return removedFields.indexOf(field) == -1;
        });
      }

      return this._textFields;
    },

    clear: function textFieldsCache_clear() {
      this._textFields = null;
    }
  };

  var initContainers = function cf_initContainers() {
    deleteContactButton = dom.querySelector('#delete-contact');
    thumb = dom.querySelector('#thumbnail-photo');
    thumb.onclick = pickImage;
    thumbAction = dom.querySelector('#thumbnail-action');
    saveButton = dom.querySelector('#save-button');
    formTitle = dom.getElementById('contact-form-title');
    currentContactId = dom.getElementById('contact-form-id');
    givenName = dom.getElementById('givenName');
    company = dom.getElementById('org');
    familyName = dom.getElementById('familyName');
    formView = dom.getElementById('view-contact-form');
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
  };

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

  var render = function cf_render(contact, callback, pFbContactData) {
    var fbContactData = pFbContactData || [];

    nonEditableValues = fbContactData[1] || {};
    deviceContact = contact;
    var renderedContact = fbContactData[0] || deviceContact;

    resetForm();
    (renderedContact && renderedContact.id) ?
                        showEdit(renderedContact) : showAdd(renderedContact);
    if (callback) {
      callback();
    }
  };

  var showEdit = function showEdit(contact) {
    if (!contact || !contact.id) {
      return;
    }
    formView.classList.add('skin-organic');
    saveButton.textContent = _('update');
    currentContact = contact;
    deleteContactButton.parentNode.classList.remove('hide');
    formTitle.innerHTML = _('editContact');
    currentContactId.value = contact.id;
    givenName.value = contact.givenName || '';
    familyName.value = contact.familyName || '';
    company.value = contact.org || '';

    if (nonEditableValues[company.value]) {
      var nodeClass = company.parentNode.classList;
      nodeClass.add(REMOVED_CLASS);
      nodeClass.add(FB_CLASS);
    }

    if (contact.photo && contact.photo.length > 0) {
      currentPhoto = contact.photo[0];
      var button = addRemoveIconToPhoto();
      // Only can be removed a device contact photo
      if (!(deviceContact.photo && deviceContact.photo.length > 0)) {
        button.classList.add('hide');
        // Avoid saving the image to the Contacts DB
        thumbAction.classList.add(REMOVED_CLASS);
        thumbAction.classList.add(FB_CLASS);
      }
    }
    Contacts.updatePhoto(currentPhoto, thumb);
    var toRender = ['tel', 'email', 'adr', 'note'];
    for (var i = 0; i < toRender.length; i++) {
      var current = toRender[i];
      renderTemplate(current, contact[current]);
    }
    deleteContactButton.onclick = function deleteClicked(event) {
      var msg = _('deleteConfirmMsg');
      var yesObject = {
        title: _('remove'),
        isDanger: true,
        callback: function onAccept() {
          deleteContact(currentContact);
          ConfirmDialog.hide();
        }
      };

      var noObject = {
        title: _('cancel'),
        callback: function onCancel() {
          ConfirmDialog.hide();
        }
      };

      ConfirmDialog.show(null, msg, noObject, yesObject);
    };
  };

  var showAdd = function showAdd(params) {
    formView.classList.remove('skin-organic');
    if (!params || params == -1 || !('id' in params)) {
      currentContact = {};
    }
    saveButton.setAttribute('disabled', 'disabled');
    saveButton.textContent = _('done');
    deleteContactButton.parentNode.classList.add('hide');
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
  };

  var onNewFieldClicked = function onNewFieldClicked(evt) {
    var type = evt.target.dataset['fieldType'];
    evt.preventDefault();
    contacts.Form.insertField(type);
    textFieldsCache.clear();
    return false;
  };

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
    var infoFromFB = false;
    for (var j = 0; j < fields.length; j++) {
      var currentElem = fields[j];
      var def = (currentElem === 'type') ? default_type : '';
      var defObj = (typeof(obj) === 'string') ? obj : obj[currentElem];
      var value = currField[currentElem] = defObj || def;
      currField[currentElem] = utils.text.escapeHTML(value, true);
      if (!infoFromFB && value && nonEditableValues[value]) {
        infoFromFB = true;
      }
    }
    currField['i'] = counters[type];
    var rendered = utils.templates.render(template, currField);

    if (infoFromFB) {
      var nodeClass = rendered.classList;
      nodeClass.add(REMOVED_CLASS);
      nodeClass.add(FB_CLASS);
    }

    // The undo button should not appear on FB disabled fields
    if (!rendered.classList.contains(REMOVED_CLASS) &&
        !rendered.classList.contains(FB_CLASS)) {
      rendered.appendChild(removeFieldIcon(rendered.id));
    }

    // Add event listeners
    var boxTitle = rendered.querySelector('legend.action');
    if (boxTitle) {
      boxTitle.addEventListener('mousedown', onGoToSelectTag);
    }

    container.appendChild(rendered);
    counters[type]++;
  };

  var onGoToSelectTag = function onGoToSelectTag(evt) {
    evt.preventDefault();
    Contacts.goToSelectTag(evt);
    return false;
  };


  var deleteContact = function deleteContact(contact) {
    var deleteSuccess = function deleteSuccess() {
      contacts.List.remove(contact.id);
      Contacts.setCurrent({});
      Contacts.navigation.home();
    };
    var request;

    if (fb.isFbContact(contact)) {
      var fbContact = new fb.Contact(contact);
      request = fbContact.remove();
      request.onsuccess = deleteSuccess;
    } else {
      request = navigator.mozContacts.remove(contact);
      request.onsuccess = deleteSuccess;
    }

    request.onerror = function errorDelete() {
      console.error('Error removing the contact');
    };
  };

  var getCurrentPhoto = function cf_getCurrentPhoto() {
    var photo = [];
    var isRemoved = thumbAction.classList.contains(REMOVED_CLASS);
    if (!isRemoved) {
      photo = currentPhoto;
    }
    return photo;
  };

  var saveContact = function saveContact() {
    currentContact = currentContact || {};
    currentContact = deviceContact || currentContact;

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
      if (!inputs[field].parentNode.classList.contains(REMOVED_CLASS) &&
                                          value && value.length > 0) {
        myContact[field] = [value];
      } else {
        myContact[field] = null;
      }
    }

    var fields = ['photo', 'category'];

    if (currentContact['category']) {
      myContact['category'] = currentContact['category'];
    }

    myContact['photo'] = currentContact['photo'] || [];
    myContact['photo'][0] = getCurrentPhoto();

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

      // If it is a FB Contact not linked it will be automatically linked
      // As now there is additional contact data entered by the user
      if (fb.isFbContact(contact)) {
        var fbContact = new fb.Contact(contact);
        // Here the contact has been promoted to linked but not saved yet
        fbContact.promoteToLinked();
      }

    } else {
      contact = new mozContact();
      contact.init(myContact);
    }

    var request = navigator.mozContacts.save(contact);

    request.onsuccess = function onsuccess() {
      // Reloading contact, as it only allows to be updated once
      var cList = contacts.List;
      cList.getContactById(contact.id, function onSuccess(savedContact,
                                        enrichedContact) {
        var nextCurrent = enrichedContact || savedContact;

        Contacts.setCurrent(savedContact);
        myContact.id = savedContact.id;

        myContact.photo = nextCurrent.photo;
        myContact.org = nextCurrent.org;
        myContact.category = nextCurrent.category;

        cList.refresh(myContact);
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postNewSuccess(savedContact);
        } else {
          contacts.Details.render(savedContact, TAG_OPTIONS);
        }
        Contacts.cancel();
      }, function onError() {
        console.error('Error reloading contact');
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postCancel();
        }
      });
    };

    request.onerror = function onerror() {
      console.error('Error saving contact', request.error.name);
    };
  };

  var getPhones = function getPhones(contact) {
    var selector = '#view-contact-form form div.phone-template:not(.removed)';
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
  };

  var getEmails = function getEmails(contact) {
    var selector = '#view-contact-form form div.email-template:not(.removed)';
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
  };

  var getAddresses = function getAddresses(contact) {
    var selector = '#view-contact-form form div.address-template:not(.removed)';
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
  };

  var getNotes = function getNotes(contact) {
    var selector = '#view-contact-form form div.note-template:not(.removed)';
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
  };

  var resetForm = function resetForm() {
    currentPhoto = null;
    thumbAction.querySelector('p').classList.remove('hide');
    var removeIcon = thumbAction.querySelector('button#' + IMG_DELETE_ID);
    if (removeIcon) {
      thumbAction.removeChild(removeIcon);
    }
    saveButton.removeAttribute('disabled');
    resetRemoved();
    currentContactId.value = '';
    currentContact = {};
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
    textFieldsCache.clear();
  };

  var resetRemoved = function cf_resetRemoved() {
    var removedFields = dom.querySelectorAll('.removed');
    for (var i = 0; i < removedFields.length; i++) {
      removedFields[i].classList.remove(REMOVED_CLASS);
    }
    thumbAction.classList.remove('with-photo');
    var removeButton = thumbAction.querySelector('button');
    if (removeButton) {
      thumbAction.removeChild(removeButton);
    }
  };

  var checkDisableButton = function checkDisableButton() {
    var saveButton = dom.getElementById('save-button');
    if (emptyForm()) {
      saveButton.setAttribute('disabled', 'disabled');
    } else {
      saveButton.removeAttribute('disabled');
    }
  };

  var emptyForm = function emptyForm() {
    var textFields = textFieldsCache.get();
    for (var i = textFields.length - 1; i >= 0; i--) {
      if (textFields[i].value)
        return false;
    }
    return true;
  };

  var removeFieldIcon = function removeFieldIcon(selector) {
    var delButton = document.createElement('button');
    delButton.id = IMG_DELETE_ID;
    delButton.className = 'fillflow-row-action';
    var delIcon = document.createElement('span');
    delIcon.setAttribute('role', 'button');
    delIcon.className = 'icon-delete';
    delButton.appendChild(delIcon);
    delButton.onclick = function removeElement(event) {
      // Workaround until 809452 is fixed.
      // What we are avoiding with this condition is removing / restoring
      // a field when the event is simulated by a ENTER Keyboard click
      if ((event.clientX === 0) && (event.clientY === 0))
        return false;
      event.preventDefault();
      var elem = document.getElementById(selector);
      elem.classList.toggle(REMOVED_CLASS);
      textFieldsCache.clear();
      checkDisableButton();
      return false;
    };
    return delButton;
  };

  var addRemoveIconToPhoto = function cf_addRemIconPhoto() {
    // Ensure the removed and FB class names are conveniently reseted
    thumbAction.classList.remove(REMOVED_CLASS);
    thumbAction.classList.remove(FB_CLASS);

    var out = thumbAction.querySelector('button#' + IMG_DELETE_ID);
    if (!out) {
      out = removeFieldIcon(thumbAction.id);
      thumbAction.appendChild(out);
    }
    else {
      // Ensure it is visible
      out.classList.remove('hide');
    }
    thumbAction.classList.add('with-photo');

    return out;
  };

  var pickImage = function pickImage() {
    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        width: PHOTO_WIDTH, // The desired width of the image
        height: PHOTO_HEIGHT // The desired height of the image
      }
    });

    activity.onsuccess = function success() {
      addRemoveIconToPhoto();

      // XXX
      // this.result.blob is valid now, but it won't stay valid
      // (see https://bugzilla.mozilla.org/show_bug.cgi?id=806503)
      // And it might not be the size we want, anyway, so we make
      // our own copy that is at the right size.
      resizeBlob(this.result.blob, PHOTO_WIDTH, PHOTO_HEIGHT,
                 function(resized) {
                   Contacts.updatePhoto(resized, thumb);
                   currentPhoto = resized;
                 });
    };

    activity.onerror = function() {
      window.console.error('Error in the activity', activity.error);
    };

    return false;
  };

  function resizeBlob(blob, target_width, target_height, callback) {
    var img = document.createElement('img');
    var url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = function() {
      var image_width = img.width;
      var image_height = img.height;
      var scalex = image_width / target_width;
      var scaley = image_height / target_height;
      var scale = Math.min(scalex, scaley);

      var w = target_width * scale;
      var h = target_height * scale;
      var x = (image_width - w) / 2;
      var y = (image_height - h) / 2;

      var canvas = document.createElement('canvas');
      canvas.width = target_width;
      canvas.height = target_height;
      var context = canvas.getContext('2d');

      context.drawImage(img, x, y, w, h, 0, 0, target_width, target_height);
      URL.revokeObjectURL(url);
      canvas.toBlob(callback, 'image/jpeg');
    };
  }

  return {
    'init': init,
    'render': render,
    'insertField': insertField,
    'saveContact': saveContact,
    'onNewFieldClicked': onNewFieldClicked,
    'pickImage': pickImage
  };
})();
