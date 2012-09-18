'use strict';

var _ = navigator.mozL10n.get;
var TAG_OPTIONS;

var Contacts = (function() {
  var navigation = new navigationStack('view-contacts-list');

  function edit() {
    navigation.go('view-contact-form', 'right-left');
  }

  var numberEmails = 0;
  var numberPhones = 0;
  var numberAddresses = 0;
  var numberNotes = 0;
  var currentContactId,
      detailsName,
      givenName,
      company,
      familyName,
      formTitle,
      phoneTemplate,
      emailTemplate,
      addressTemplate,
      noteTemplate,
      phonesContainer,
      emailContainer,
      addressContainer,
      noteContainer,
      selectedTag,
      customTag,
      contactTag,
      saveButton,
      editContactButton,
      deleteContactButton,
      thumb,
      thumbAction;

  var currentContact = {};

  var contactsList = contacts.List;
  var contactsDetails = contacts.Details;

  var checkUrl = function checkUrl() {
    var hasParams = window.location.hash.split('?');
    var hash = hasParams[0];
    var sectionId = hash.substr(1, hash.length) || '';
    var cList = contacts.List;
    var params = hasParams.length > 1 ?
      extractParams(hasParams[1]) : -1;

    switch (sectionId) {
      case 'view-contact-details':
        if (params == -1 || !('id' in params)) {
          console.log('Param missing');
          return;
        }
        var id = params['id'];
        cList.getContactById(id, function onSuccess(savedContact) {
          currentContact = savedContact;
          contactsDetails.render(currentContact, TAG_OPTIONS);
          navigation.go(sectionId, 'none');
        }, function onError() {
          console.error('Error retrieving contact');
        });
        break;

      case 'view-contact-form':
        if (params == -1 || !('id' in params)) {
          showAdd(params);
        } else {
          // Editing existing contact
          if ('id' in params) {
            var id = params['id'];
            cList.getContactById(id, function onSuccess(savedContact) {
              currentContact = savedContact;
              showEdit();
            }, function onError() {
              console.log('Error retrieving contact to be edited');
              showAdd();
            });
          }
        }
        break;

    }

    if (!contactsList.loaded) {
      loadList();
    }

  }

  var extractParams = function extractParams(url) {
    if (!url) {
      return -1;
    }
    var ret = {};
    var params = url.split('&');
    for (var i = 0; i < params.length; i++) {
      var currentParam = params[i].split('=');
      ret[currentParam[0]] = currentParam[1];
    }
    return ret;
  }

  var initContainers = function initContainers() {
    currentContactId = document.getElementById('contact-form-id');
    givenName = document.getElementById('givenName');
    company = document.getElementById('org');
    familyName = document.getElementById('familyName');
    formTitle = document.getElementById('contact-form-title');
    phoneTemplate = document.getElementById('add-phone-#i#');
    emailTemplate = document.getElementById('add-email-#i#');
    addressTemplate = document.getElementById('add-address-#i#');
    noteTemplate = document.getElementById('add-note-#i#');
    phonesContainer = document.getElementById('contacts-form-phones');
    emailContainer = document.getElementById('contacts-form-emails');
    addressContainer = document.getElementById('contacts-form-addresses');
    noteContainer = document.getElementById('contacts-form-notes');
    saveButton = document.getElementById('save-button');
    deleteContactButton = document.getElementById('delete-contact');
    customTag = document.getElementById('custom-tag');
    thumb = document.getElementById('thumbnail-photo');
    thumbAction = document.getElementById('thumbnail-action');
    thumbAction.addEventListener('mousedown', onThumbMouseDown);
    thumbAction.addEventListener('mouseup', onThumbMouseUp);
    TAG_OPTIONS = {
      'phone-type' : [
        {value: _('mobile')},
        {value: _('home')},
        {value: _('work')},
        {value: _('personal')},
        {value: _('faxHome')},
        {value: _('faxOffice')},
        {value: _('faxOther')},
        {value: _('another')}
      ],
      'email-type' : [
        {value: _('personal')},
        {value: _('home')},
        {value: _('work')}
      ],
      'address-type' : [
        {value: _('home')},
        {value: _('work')}
      ]
    };
  };

  window.addEventListener('localized', function initContacts(evt) {
    initLanguages();
    initContainers();
    initContactsList();
    checkUrl();
    contactsDetails.init();
    window.addEventListener('hashchange', checkUrl);
    document.body.classList.remove('hide');
  });

  var initContactsList = function initContactsList() {
    var list = document.getElementById('groups-list');
    contactsList.init(list);
    checkCancelableActivity();
  };

  var checkCancelableActivity = function cancelableActivity() {
    var cancelButton = document.getElementById('cancel_activty');
    var addButton = document.getElementById('add-contact-button');
    if (ActivityHandler.currentlyHandling) {
      cancelButton.classList.remove('hide');
      addButton.classList.add('hide');
    } else {
      cancelButton.classList.add('hide');
      addButton.classList.remove('hide');
    }
  }

  var initLanguages = function initLanguages() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  };

  document.addEventListener('input', function input(event) {
    checkDisableButton();
  });

  // When the cancel button inside the input is clicked
  document.addEventListener('cancelInput', function() {
    checkDisableButton();
  });

  var checkDisableButton = function checkDisable() {
    var saveButton = document.getElementById('save-button');
    if (emptyForm('contact-form')) {
      saveButton.setAttribute('disabled', 'disabled');
    } else {
      saveButton.removeAttribute('disabled');
    }
  };

  var emptyForm = function emptyForm(id) {
    var form = document.getElementById(id);
    var inputs = form.querySelectorAll('input.textfield');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value != '')
        return false;
    }
    return true;
  }

  var dataPickHandler = function dataPickHandler() {
    var type, dataSet, noDataStr, selectDataStr;
    // Add the new pick type here:
    switch (ActivityHandler.activityDataType) {
      case 'webcontacts/contact':
        type = 'number';
        dataSet = currentContact.tel;
        noDataStr = _('no_phones');
        selectDataStr = _('select_mobile');
        break;
      case 'webcontacts/email':
        type = 'email';
        dataSet = currentContact.email;
        noDataStr = _('no_email');
        selectDataStr = _('select_email');
        break;
    }

    var hasData = dataSet && dataSet.length;
    var numOfData = hasData ? dataSet.length : 0;

    var result = {};
    result.name = currentContact.name;
    switch (numOfData) {
      case 0:
        // If no required type of data
        var dismiss = {
          title: _('ok'),
          callback: CustomDialog.hide
        };
        CustomDialog.show('', noDataStr, dismiss);
        break;
      case 1:
        // if one required type of data
        var data = dataSet[0].value;
        result[type] = data;
        ActivityHandler.postPickSuccess(result);
        break;
      default:
        // if more than one required type of data
        var prompt1 = new ValueSelector(selectDataStr);
        for (var i = 0; i < dataSet.length; i++) {
          var data = dataSet[i].value,
              carrier = dataSet[i].carrier || '';
          prompt1.addToList(data + ' ' + carrier, function(itemData) {
            return function() {
              prompt1.hide();
              result[type] = itemData;
              ActivityHandler.postPickSuccess(result);
            }
          }(data));

        }
        prompt1.show();
    }
  }

  var loadList = function loadList() {
    contactsList.load();
    contactsList.handleClick(function handleClick(id) {
      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: id
      };

      var request = navigator.mozContacts.find(options);
      request.onsuccess = function findCallback() {
        currentContact = request.result[0];

        if (!ActivityHandler.currentlyHandling) {
          contactsDetails.render(currentContact, TAG_OPTIONS);
          navigation.go('view-contact-details', 'right-left');
          return;
        }

        dataPickHandler();
      };
    });
  };

  var getLength = function getLength(prop) {
    if (!prop || !prop.length) {
      return 0;
    }
    return prop.length;
  };

  var showEdit = function showEdit() {
    resetForm();
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

    var default_type = TAG_OPTIONS['phone-type'][0].value;
    var telLength = getLength(currentContact.tel);
    for (var tel = 0; tel < telLength; tel++) {
      var currentTel = currentContact.tel[tel];
      var telField = {
        value: currentTel.value || '',
        type: currentTel.type || default_type,
        carrier: currentTel.carrier || '',
        i: tel
      };

      var template = utils.templates.render(phoneTemplate, telField);
      template.appendChild(removeFieldIcon(template.id));
      phonesContainer.appendChild(template);
      numberPhones++;
    }

    var emailLength = getLength(currentContact.email);
    for (var email = 0; email < emailLength; email++) {
      var currentEmail = currentContact.email[email];
      var default_type = TAG_OPTIONS['email-type'][0].value;
      var emailField = {
        value: currentEmail['value'] || '',
        type: currentEmail['type'] || default_type,
        i: email
      };

      var template = utils.templates.render(emailTemplate, emailField);
      template.appendChild(removeFieldIcon(template.id));
      emailContainer.appendChild(template);
      numberEmails++;
    }

    if (currentContact.adr) {
      for (var adr = 0; adr < currentContact.adr.length; adr++) {
        var currentAddress = currentContact.adr[adr];
        if (isEmpty(currentAddress, ['streetAddress', 'postalCode',
          'locality', 'countryName'])) {
            continue;
        }
        var default_type = TAG_OPTIONS['address-type'][0].value;
        var adrField = {
          streetAddress: currentAddress['streetAddress'] || '',
          postalCode: currentAddress['postalCode'] || '',
          locality: currentAddress['locality'] || '',
          countryName: currentAddress['countryName'] || '',
          type: currentAddress['type'] || default_type,
          i: adr
        };

        var template = utils.templates.render(addressTemplate, adrField);
        template.appendChild(removeFieldIcon(template.id));
        addressContainer.appendChild(template);
        numberAddresses++;
      }
    }
    var noteLength = getLength(currentContact.note);
    for (var i = 0; i < noteLength; i++) {
      var currentNote = currentContact.note[i];
      var noteField = {
        note: currentNote || '',
        i: i
      };
      var template = utils.templates.render(noteTemplate, noteField);
      template.appendChild(removeFieldIcon(template.id));
      noteContainer.appendChild(template);
      numberNotes++;
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

    edit();
  };

  var updatePhoto = function updatePhoto(photo, dest) {
    var background = '';
    if (photo != null) {
      background = 'url(' + URL.createObjectURL(photo) + ')';
    }
    dest.style.backgroundImage = background;
  };

  // Checks if an object fields are empty, by empty means
  // field is null and if it's an array it's length is 0
  var isEmpty = function isEmpty(obj, fields) {
    if (obj == null || typeof(obj) != 'object' ||
        !fields || !fields.length) {
      return true;
    }
    var attr;
    var isArray;
    for (var i = 0; i < fields.length; i++) {
      attr = fields[i];
      if (obj.hasOwnProperty(attr) && obj[attr]) {
        if (Array.isArray(obj[attr])) {
          if (obj[attr].length > 0) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    return true;
  };

  var goToSelectTag = function goToSelectTag(event) {
    var target = event.currentTarget.children[0];
    var tagList = target.dataset.taglist;
    var options = TAG_OPTIONS[tagList];
    fillTagOptions(options, tagList, target);
    navigation.go('view-select-tag', 'right-left');
  };

  var fillTagOptions = function fillTagOptions(options, tagList, update) {
    var container = document.getElementById('tags-list');
    container.innerHTML = '';
    contactTag = update;

    var selectedLink;
    for (var option in options) {
      var link = document.createElement('a');
      link.href = '#';
      link.dataset.index = option;
      link.textContent = options[option].value;

      link.onclick = function(event) {
        var index = event.target.dataset.index;
        selectTag(event.target, tagList);
      };

      if (update.textContent == TAG_OPTIONS[tagList][option].value) {
        selectedLink = link;
      }

      var list = document.createElement('li');
      list.appendChild(link);
      container.appendChild(list);
    }

    // Deal with the custom tag, clean or fill
    customTag.value = '';
    if (!selectedLink && update.textContent) {
      customTag.value = update.textContent;
    }
    customTag.onclick = function(event) {
      if (selectedTag) {
        // Remove any mark if we had selected other option
        selectedTag.removeChild(selectedTag.firstChild.nextSibling);
      }
      selectedTag = null;
    }

    selectTag(selectedLink);
  };

  var selectTag = function selectTag(link, tagList) {
    if (link == null) {
      return;
    }

    //Clean any trace of the custom tag
    customTag.value = '';

    var index = link.dataset.index;

    if (selectedTag) {
      selectedTag.removeChild(selectedTag.firstChild.nextSibling);
    }

    var icon = document.createElement('span');
    icon.className = 'slcl-state icon-selected';
    icon.setAttribute('role', 'button');
    link.appendChild(icon);
    selectedTag = link;
  };

  /*
  * Finish the tag edition, check if we have a custom
  * tag selected or use the predefined ones
  */
  var doneTag = function doneTag() {
    if (selectedTag) {
      contactTag.textContent = selectedTag.textContent;
    } else if (customTag.value.length > 0) {
      contactTag.textContent = customTag.value;
    }
    contactTag = null;
    this.goBack();
  };

  var sendSms = function sendSms(number) {
    if (!ActivityHandler.currentlyHandling)
      SmsIntegration.sendSms(number);
  }

  var callOrPick = function callOrPick(number) {
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postPickSuccess({ number: number });
    } else {
      try {
        var activity = new MozActivity({
          name: 'dial',
          data: {
            type: 'webtelephony/number',
            number: number
          }
        });

        var reopenApp = function reopenApp() {
          navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
            var app = evt.target.result;
            app.launch('contacts');
          };
        }

        activity.onerror = function error() {
          reopenApp();
        }
      } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
      }
    }
  }

  var showAdd = function showAdd(params) {
    if (!params || params == -1 || !('id' in params)) {
      currentContact = {};
    }
    resetForm();
    saveButton.setAttribute('disabled', 'disabled');
    deleteContactButton.classList.add('hide');
    formTitle.innerHTML = _('addContact');

    params = params || {};

    givenName.value = params.giveName || '';
    familyName.value = params.lastName || '';
    company.value = params.company || '';

    var paramsMapping = {
      'tel' : insertPhone,
      'email' : insertEmail,
      'address' : insertAddress,
      'note' : insertNote
    };
    formTitle.innerHTML = _('addContact');

    for (var i in paramsMapping) {
      paramsMapping[i].call(this, params[i] || 0);
    }
    checkDisableButton();
    edit();
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

  var handleBack = function handleBack() {
    navigation.back();
  };

  var handleCancel = function handleCancel() {
    //If in an activity, cancel it
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postCancel();
      navigation.home();
    } else {
      handleBack();
    }
  };

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
        updatePhoto(null, thumb);
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
        updatePhoto(dataImg, thumb);
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

  var sendEmailOrPick = function sendEmailOrPick(address) {
    if (ActivityHandler.currentlyHandling) {
      // Placeholder for the email app if we want to
      // launch contacts to select an email address.
      // So far we do nothing
    } else {
      try {
        // We don't check the email format, lets the email
        // app do that
        var activity = new MozActivity({
          name: 'new',
          data: {
            type: 'mail',
            URI: 'mailto:' + address
          }
        });
      } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
      }
    }
  };

  var isUpdated = function isUpdated(contact1, contact2) {
    return contact1.id == contact2.id &&
      (contact1.updated - contact2.updated) == 0;
  }

  // When a visiblity change is sent, handles and updates the
  // different views according to the app state
  var handleVisibilityChange = function handleVisibilityChange() {
    contacts.List.load();
    switch (navigation.currentView()) {
      case 'view-contact-details':
        if (!currentContact) {
          return;
        }
        contacts.List.getContactById(currentContact.id, function(contact) {
          if (isUpdated(contact, currentContact)) {
            return;
          }
          currentContact = contact;
          contactsDetails.render(currentContact, TAG_OPTIONS);
        });
        break;
      case 'view-contact-form':
        if (!currentContact) {
          return;
        }
        contacts.List.getContactById(currentContact.id, function(contact) {
          if (isUpdated(contact, currentContact)) {
            return;
          }
          currentContact = contact;
          contactsDetails.render(currentContact, TAG_OPTIONS);
          navigation.back();
        });
        break;
    }
  };

  return {
    'showEdit' : showEdit,
    'doneTag': doneTag,
    'showAdd': showAdd,
    'addNewPhone' : insertPhone,
    'addNewEmail' : insertEmail,
    'addNewAddress' : insertAddress,
    'addNewNote' : insertNote,
    'cancel' : handleCancel,
    'goBack' : handleBack,
    'goToSelectTag': goToSelectTag,
    'sendSms': sendSms,
    'saveContact': saveContact,
    'callOrPick': callOrPick,
    'pickImage': pickImage,
    'navigation': navigation,
    'sendEmailOrPick': sendEmailOrPick,
    'updatePhoto': updatePhoto,
    'checkCancelableActivity': checkCancelableActivity,
    'isEmpty': isEmpty,
    'getLength': getLength,
    'handleVisibilityChange': handleVisibilityChange
  };
})();

fb.contacts.init(function() {
  if (window.navigator.mozSetMessageHandler && window.self == window.top) {
    var actHandler = ActivityHandler.handle.bind(ActivityHandler);
    window.navigator.mozSetMessageHandler('activity', actHandler);
  }
  document.addEventListener('mozvisibilitychange', function visibility(e) {
    if (ActivityHandler.currentlyHandling && document.mozHidden) {
      ActivityHandler.postCancel();
      return;
    }
    if (!ActivityHandler.currentlyHandling && !document.mozHidden) {
      Contacts.handleVisibilityChange();
    }
    Contacts.checkCancelableActivity();
  });
});

