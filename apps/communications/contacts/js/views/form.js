'use strict';
/* global ActivityHandler */
/* global ConfirmDialog */
/* global ContactPhotoHelper */
/* global Contacts */
/* global ContactsTag */
/* global fb */
/* global LazyLoader */
/* global MozActivity */
/* global Normalizer */
/* global ContactsService */
/* global utils */
/* global TAG_OPTIONS */
/* global ActionMenu */
/* global ICEData */
/* global MergeHelper */
/* global MainNavigation */
/* global ExtServices */
/* global ContactsService */
/* global Matcher */
/* global TagSelector */

var contacts = window.contacts || {};

contacts.Form = (function() {
  var counters = {
    'tel': 0,
    'email': 0,
    'adr': 0,
    'date': 0,
    'note': 0
  };

  var currentContact = {};
  var dom,
      contactForm,
      deleteContactButton,
      addNewDateButton,
      thumb,
      thumbAction,
      saveButton,
      formHeader,
      formTitle,
      currentContactId,
      givenName,
      company,
      familyName,
      configs,
      _,
      formView,
      throbber,
      mode,
      cancelHandler,
      mergeHandler,
      nonEditableValues,
      deviceContact,
      fbContact,
      currentPhoto;

  var FB_CLASS = 'facebook';
  var INVALID_CLASS = 'invalid';

  // Remove icon button id
  var IMG_DELETE_CLASS = 'img-delete-button';

  // The size we want our contact photos to be
  var PHOTO_WIDTH = 320;
  var PHOTO_HEIGHT = 320;
  // bug 1038414: ask for an image about 2MP before
  // doing the crop to save memory in both apps
  var MAX_PHOTO_SIZE = 200000;

  var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';

  // Indicates whether a tel number has been deleted
  // (useful for warning about ICE Contacts)
  var deletedTelNumber = false;

  var textFieldsCache = {
    _textFields: null,

    get: function textFieldsCache_get() {
      if (!this._textFields) {
        var fields = contactForm.querySelectorAll('input[data-field]');

        var fbFields =
          Array.slice(contactForm.querySelectorAll(
                                                '.facebook input[data-field]'));
        var invalidFields =
          Array.slice(contactForm.querySelectorAll(
                                                '.invalid input[data-field]'));

        this._textFields = Array.filter(fields, function(field) {
          return (fbFields.indexOf(field) === -1 &&
                                         invalidFields.indexOf(field) === -1);
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
    thumbAction = dom.querySelector('#thumbnail-action');
    thumbAction.querySelector('#photo-button').onclick = photoAction;
    saveButton = dom.querySelector('#save-button');
    addNewDateButton = dom.querySelector('#add-new-date');
    contactForm = dom.getElementById('contact-form');
    formHeader = dom.querySelector('#contact-form-header');
    formTitle = dom.getElementById('contact-form-title');
    currentContactId = dom.getElementById('contact-form-id');
    givenName = dom.getElementById('givenName');
    company = dom.getElementById('org');
    familyName = dom.getElementById('familyName');
    formView = dom.getElementById('view-contact-form');
    throbber = dom.getElementById('throbber');
    var phonesContainer = dom.getElementById('contacts-form-phones');
    var emailContainer = dom.getElementById('contacts-form-emails');
    var addressContainer = dom.getElementById('contacts-form-addresses');
    var dateContainer = dom.getElementById('contacts-form-dates');
    var noteContainer = dom.getElementById('contacts-form-notes');
    var phoneTemplate = dom.getElementById('add-phone-#i#');
    var emailTemplate = dom.getElementById('add-email-#i#');
    var addressTemplate = dom.getElementById('add-address-#i#');
    var dateTemplate = dom.getElementById('add-date-#i#');
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
      'date': {
        template: dateTemplate,
        tags: TAG_OPTIONS['date-type'],
        fields: ['value', 'type'],
        container: dateContainer
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

    _ = navigator.mozL10n.get;
    initContainers();

    dom.addEventListener('input', function input(event) {
      checkDisableButton();
    });

    contactForm.addEventListener(touchstart, function click(event) {
      var tgt = event.target;
      if (tgt.tagName == 'BUTTON' && tgt.getAttribute('type') == 'reset') {
        event.preventDefault();
        var input = tgt.previousElementSibling;

        if (input.getAttribute('name').startsWith('tel') &&
            input.dataset.field === 'value') {
          var telId = input.id;
          var telIndex = telId.substring(telId.indexOf('_') + 1);
          var carrierField =
                        document.getElementById('carrier' + '_' + telIndex);
          carrierField.parentNode.classList.add(INVALID_CLASS);

          textFieldsCache.clear();
          deletedTelNumber = true;
        }
        input.value = '';
        checkDisableButton();
      }
    });

    thumbAction.addEventListener(touchstart, function click(event) {
      // Removing current photo
      if (event.target.tagName == 'BUTTON') {
        saveButton.removeAttribute('disabled');
      }
    });

    formView.addEventListener('ValueModified', function onValueModified(event) {
      if (!event.detail) {
        return;
      }

      if (!emptyForm() && event.detail.prevValue !== event.detail.newValue) {
        saveButton.removeAttribute('disabled');
      }
    });

    // Add listeners
    utils.listeners.add({
      '#contact-form-header': [
        {
          event: 'action',
          handler: Contacts.cancel // Cancel edition
        }
      ],
      '#save-button': saveContact,
      '#contact-form button[data-field-type]': newField
    });
  };

   // Renders the birthday as per the locale
  function renderDate(date, bdayInputText) {
    if (!date) {
      return;
    }

    bdayInputText.textContent = utils.misc.formatDate(date);
    bdayInputText.classList.remove('placeholder');
  }

  function onInputDate(bdayInputText, e) {
    renderDate(e.target.valueAsDate, bdayInputText);
  }

  var newField = function newField(evt) {
    return contacts.Form.onNewFieldClicked(evt);
  };

  var render = function cf_render(contact, callback, pFbContactData,
                                  fromUpdateActivity) {
    var fbContactData = pFbContactData || [];

    fbContact = fbContactData[2] || {};
    nonEditableValues = fbContactData[1] || {};
    deviceContact = contact;
    var renderedContact = fbContactData[0] || deviceContact;

    resetForm();

    // We need to check against the string 'undefined' because of bug 951829.
    renderedContact && renderedContact.id && renderedContact.id != 'undefined' ?
       showEdit(renderedContact, fromUpdateActivity) : showAdd(renderedContact);

    // reset the scroll from (possible) previous renders
    contactForm.parentNode.scrollTop = 0;

    if (callback) {
      callback();
    }
  };

  function extractValue(value) {
    if (value) {
      if (Array.isArray(value) && value.length > 0 && value[0]) {
        return value[0].trim();
      } else if (!Array.isArray(value)) {
        return value.trim();
      }
    }

    return '';
    // The last statement allows to return the value in case we are getting
    // just params from an activity and not a mozContact.
  }

  function fillDates(contact) {
    if (contact.bday) {
      contact.date = [];

      contact.date.push({
        type: 'birthday',
        value: contact.bday
      });
    }

    if (contact.anniversary) {
      contact.date = contact.date || [];
      contact.date.push({
        type: 'anniversary',
        value: contact.anniversary
      });
    }
  }

  function renderPhoto(contact) {
    if (contact.photo && contact.photo.length > 0) {
      currentPhoto = ContactPhotoHelper.getFullResolution(contact);
      var button = addRemoveIconToPhoto();
      // Only can be removed a device contact photo
      if (!(deviceContact.photo && deviceContact.photo.length > 0)) {
        button.classList.add('hide');
        // Avoid saving the image to the Contacts DB
        thumbAction.classList.add(FB_CLASS);
      }
    }

    utils.dom.updatePhoto(currentPhoto, thumb);
  }

  var showEdit = function showEdit(contact, fromUpdateActivity) {
    mode = 'edit';
    if (!contact || !contact.id) {
      return;
    }
    if (!fromUpdateActivity) {
      saveButton.setAttribute('disabled', 'disabled');
    }
    saveButton.setAttribute('data-l10n-id', 'update');
    currentContact = contact;
    deleteContactButton.parentNode.classList.remove('hide');
    formTitle.setAttribute('data-l10n-id', 'editContact');
    currentContactId.value = contact.id;
    givenName.value = extractValue(contact.givenName);
    familyName.value = extractValue(contact.familyName);
    company.value = extractValue(contact.org);

    if (nonEditableValues[company.value]) {
      var nodeClass = company.parentNode.classList;
      nodeClass.add(FB_CLASS);
    }

    renderPhoto(contact);

    fillDates(contact);

    ['tel', 'email', 'adr', 'date', 'note'].forEach(function(field) {
      renderTemplate(field, contact[field]);
    });

    deleteContactButton.onclick = function deleteClicked(event) {
      var msg = 'deleteConfirmMsg';
      var yesObject = {
        title: 'delete',
        isDanger: true,
        callback: function onAccept() {
          deleteContact(currentContact);
          ConfirmDialog.hide();
          if (ActivityHandler.currentlyHandling) {
            formHeader.triggerAction();
          }
        }
      };

      var noObject = {
        title: 'cancel',
        callback: function onCancel() {
          ConfirmDialog.hide();
        }
      };

      ConfirmDialog.show(null, msg, noObject, yesObject);
    };
  };

  // Checks whether is an ICE contact or not
  function isIceContact(contact, cb) {
    LazyLoader.load('js/utilities/ice_data.js', function() {
      ICEData.getActiveIceContacts().then(function iceloaded(iceContacts) {
        cb(iceContacts.indexOf(contact.id) !== -1);
      });
    });
  }

  var showAdd = function showAdd(params) {
    mode = 'add';
    formView.classList.remove('skin-organic');
    if (!params || params == -1 || !params.id) {
      currentContact = {};
    }
    saveButton.setAttribute('disabled', 'disabled');
    saveButton.setAttribute('data-l10n-id', 'done');
    deleteContactButton.parentNode.classList.add('hide');
    formTitle.setAttribute('data-l10n-id', 'addContact');

    params = params || {};

    givenName.value = extractValue(params.givenName);
    familyName.value = extractValue(params.lastName || params.familyName);
    company.value = extractValue(params.company || params.org);

    renderPhoto(params);

    fillDates(params);

    ['tel', 'email', 'adr', 'date', 'note'].forEach(function(field) {
      renderTemplate(field, params[field]);
    });

    checkDisableButton();
  };


  // template, fields, cont, counter
  /**
   * Render Template
   *
   * @param {string} type Type of template, eg. 'tel'
   * @param {object[]} toRender
   */
  var renderTemplate = function cf_rendTemplate(type, toRender) {
    if (!Array.isArray(toRender)) {
      toRender = [{value: toRender}];
    }

    for (var i = 0; i < toRender.length; i++) {
      insertField(type, toRender[i] || {});
    }
  };

  function checkAddDateButton() {
    addNewDateButton.disabled = (getActiveFormDates() >= 2);
  }

  function getActiveFormDates() {
    var fbDates = dom.querySelectorAll('.date-template' + '.' + FB_CLASS);

    return counters.date - fbDates.length;
  }

  var onNewFieldClicked = function onNewFieldClicked(evt) {
    var type = evt.target.dataset.fieldType;
    evt.preventDefault();
    // Workaround until 809452 is fixed.
    // What we are avoiding with this condition is removing / restoring
    // a field when the event is simulated by a ENTER Keyboard click
    if (evt.explicitOriginalTarget === evt.target) {
        contacts.Form.insertField(type, null, [
          'inserted',
          'displayed'
        ]);
    }
    textFieldsCache.clear();
    // For dates only two instances
    if (type === 'date') {
      // Disable the add date button if necessary
      checkAddDateButton();
    }
    return false;
  };

  function checkCarrierTel(carrierInput, event) {
    var telInput = event.target;
    var value = telInput.value;

    if (!value || !value.trim()) {
      deletedTelNumber = true;

      // If it was not previously filled then it will be disabled
      if (!telInput.dataset.wasFilled) {
        carrierInput.setAttribute('disabled', 'disabled');
      }
      else {
        // Otherwise marked as invalid in order not to submit it
        carrierInput.parentNode.classList.add(INVALID_CLASS);
        textFieldsCache.clear();
      }
    }
    else {
      deletedTelNumber = false;

      // Marked as filled
      telInput.dataset.wasFilled = true;
      // Enabling and marking as valid
      carrierInput.removeAttribute('disabled');
      carrierInput.parentNode.classList.remove(INVALID_CLASS);
    }
  }

  /**
   * We cannot relay on the counter, but in the next id after the
   * last field.
   * See bug 1113134 for related explanation.
   */
  function getNextTemplateId(container) {
    var nodes = container.childNodes;
    if (!nodes || nodes.length === 0) {
      return 0;
    }

    var lastNode = nodes[nodes.length - 1];
    var value = lastNode.dataset.index;
    return value ? parseInt(value) + 1 : 0;
  }

  var insertField = function insertField(type, object, targetClasses) {
    if (!type || !configs[type]) {
      console.error('Inserting field with unknown type');
      return;
    }
    var obj = object || {};
    var config = configs[type];
    var template = config.template;
    var tags = ContactsTag.filterTags(type, null, config.tags);

    var container = config.container;

    var default_type = tags[0] && tags[0].type || '';
    var currField = {};
    var infoFromFB = false;

    config.fields.forEach(function(currentElem) {
      var def = (currentElem === 'type') ? default_type : '';
      var defObj = (typeof(obj) === 'string') ? obj : obj[currentElem];
      var value = '';
      var isDate = (defObj && typeof defObj.getMonth === 'function');

      currField[currentElem] = (defObj && typeof(defObj) === 'object' &&
                                      !isDate ? defObj.toString() : defObj);
      value = currField[currentElem] || def;
      if (currentElem === 'type') {
        currField.type_value = value;

        // Do localization for built-in types
        if (isBuiltInType(value, tags)) {
          currField.type_l10n_id = value;
          value = _(value) || value;
        }
      }
      if (!isDate) {
        currField[currentElem] = Normalizer.escapeHTML(value, true);
      }

      if (!infoFromFB && value && nonEditableValues[value]) {
        infoFromFB = true;
      }
    });
    currField.i = getNextTemplateId(container);

    var rendered = utils.templates.render(template, currField);
    // Controlling that if no tel phone is present carrier field is disabled
    if (type === 'tel') {
      var carrierInput = rendered.querySelector('input[data-field="carrier"]');
      var telInput = rendered.querySelector('input[data-field="value"]');

      var cb = checkCarrierTel.bind(null, carrierInput);

      telInput.addEventListener('input', cb, true);

      checkCarrierTel(carrierInput, {target: telInput});
    }

    // Adding listener to properly render dates
    if (type === 'date') {
      var dateInput = rendered.querySelector('input[type="date"]');

      // Setting the max value as today's date
      var currentDate = new Date();
      dateInput.setAttribute('max', currentDate.getFullYear() + '-' +
                             (currentDate.getMonth() + 1) + '-' +
                             currentDate.getDate());

      var dateInputText = dateInput.previousElementSibling;
      if (currField.value) {
        dateInput.valueAsDate = currField.value;
        renderDate(currField.value, dateInputText);
      }
      else {
        dateInputText.setAttribute('data-l10n-id', 'date-span-placeholder');
      }

      dateInput.addEventListener('input',
        onInputDate.bind(null, dateInputText));
    }

    if (infoFromFB) {
      var nodeClass = rendered.classList;
      nodeClass.add(FB_CLASS);
    }

    // The remove button should not appear on FB disabled fields
    if (!rendered.classList.contains(FB_CLASS)) {
      var removeEl = removeFieldIcon(rendered.id, type);
      rendered.insertBefore(removeEl, rendered.firstChild);
    }

    // Add event listeners
    var boxTitle = rendered.querySelector('legend.action');
    if (boxTitle) {
      boxTitle.addEventListener('click', onGoToSelectTag);
    }

    // This will happen when the fields are added by the user on demand
    if (Array.isArray(targetClasses)) {
      rendered.classList.add(targetClasses[0]);
      window.setTimeout(() => rendered.classList.add(targetClasses[1]));
    }

    container.classList.remove('empty');
    container.appendChild(rendered);
    counters[type]++;

    // Finally we need to check the status of the add date button
    if (type === 'date') {
      checkAddDateButton();
    }
  };

  var onGoToSelectTag = function onGoToSelectTag(evt) {
    evt.preventDefault();
    var target = evt.currentTarget;
    LazyLoader.load('/contacts/js/utilities/tagSelector.js', function() {
      TagSelector.show(target.children[0]);
    });
    return false;
  };


  var deleteContact = function deleteContact(contact) {
    var deleteSuccess = function deleteSuccess() {
      if (contacts.Search && contacts.Search.isInSearchMode()) {
        contacts.Search.invalidateCache();
        contacts.Search.removeContact(contact.id);
        contacts.Search.exitSearchMode();
      }
      // As we jump back to the list, stop listening for NFC and
      // prevent sharing contacts from the contact list.
      if ('mozNfc' in navigator && contacts.NFC) {
        contacts.NFC.stopListening();
      }
      MainNavigation.home();
    };

    ContactsService.remove(
      contact,
      function(e) {
        if (e) {
          console.error('Error removing the contact');
          return;
        }
        deleteSuccess();
      }
    );
  };

  var getCurrentPhoto = function cf_getCurrentPhoto() {
    var photo;
    var isFacebook = thumbAction.classList.contains(FB_CLASS);
    if (!isFacebook) {
      photo = currentPhoto;
    }
    return photo; // we return undefined on purpose here
  };

  var CATEGORY_WHITE_LIST = ['gmail', 'live'];
  function updateCategoryForImported(contact) {
    if (Array.isArray(contact.category)) {
      var total = CATEGORY_WHITE_LIST.length;
      var idx = -1;
      for (var i = 0; i < total; i++) {
        idx = contact.category.indexOf(CATEGORY_WHITE_LIST[i]);
        if (idx !== -1) {
          break;
        }
      }
      if (idx !== -1) {
        contact.category[idx] = contact.category[idx] + '/updated';
      }
    }
  }

  var fillContact = function(contact, done) {
    createName(contact);

    getPhones(contact);
    getEmails(contact);
    getAddresses(contact);
    getNotes(contact);
    getDates(contact);

    var currentPhoto = getCurrentPhoto();
    if (!currentPhoto) {
      done(contact);
      return;
    }

    utils.thumbnailImage(currentPhoto, function gotTumbnail(thumbnail) {
      if (currentPhoto !== thumbnail) {
        contact.photo = [currentPhoto, thumbnail];
      } else {
        contact.photo = [currentPhoto];
      }
      done(contact);
    });
  };

  var saveContact = function saveContact() {
    saveButton.setAttribute('disabled', 'disabled');
    showThrobber();

    var cancelObject = {
      title: 'ok',
      callback: function onCancel() {
        ConfirmDialog.hide();
        continueSavingContact();
      }
    };

    if (deletedTelNumber) {
      isIceContact(currentContact, function(result) {
        if (result === true) {
          var msgId = 'ICEContactDelTel';
          var selector = 'div:not([data-template]) .textfield[type="tel"]';
          var telInputs = document.querySelectorAll(selector);
          var hasNumber = false;

          for (var i = 0, len = telInputs.length; i < len; i++) {
            if (telInputs[i].value.trim()) {
              hasNumber = true;
              break;
            }
          }

          if (!hasNumber) {
            msgId = 'ICEContactDelTelAll';
            ICEData.removeICEContact(currentContact.id);
          }
          ConfirmDialog.show(null, {'id': msgId},
                                 cancelObject);
        }
        else {
          continueSavingContact();
        }
      });
    }
    else {
      continueSavingContact();
    }
  };

  function continueSavingContact() {
    currentContact = currentContact || {};
    currentContact = deviceContact || currentContact;
    var deviceGivenName = currentContact.givenName || [''];
    var deviceFamilyName = currentContact.familyName || [''];

    var myContact = {
      id: document.getElementById('contact-form-id').value,
      additionalName: [''],
      name: ['']
    };

    var inputs = { givenName, familyName };

    for (var field in inputs) {
      var value = inputs[field].value;
      if (value && value.length > 0) {
        myContact[field] = [value];
      } else {
        myContact[field] = null;
      }
    }

    if (!company.parentNode.classList.contains(FB_CLASS) &&
     company.value && company.value.length > 0) {
      myContact.org = [company.value];
    }

    if (currentContact.category) {
      myContact.category = currentContact.category;
    }

    fillContact(myContact, function contactFilled(myContact) {
      // Check if all fields but address are empty
      // and inspect address by it self.
      var fields = ['givenName', 'familyName', 'org', 'tel',
        'email', 'note', 'bday', 'anniversary', 'adr'];

      // Load what we need to check myContact
      LazyLoader.load('/contacts/js/utilities/mozContact.js', function() {
        if (utils.mozContact.haveEmptyFields(myContact, fields)) {
          return;
        }

        var contact;
        if (myContact.id) { //Editing a contact
          currentContact.tel = [];
          currentContact.email = [];
          currentContact.org = [];
          currentContact.adr = [];
          currentContact.note = [];
          currentContact.photo = [];
          currentContact.bday = null;
          currentContact.anniversary = null;
          var readOnly = ['id', 'updated', 'published'];
          for (var field in myContact) {
            if (readOnly.indexOf(field) == -1) {
              currentContact[field] = myContact[field];
            }
          }
          contact = currentContact;

          if (fb.isFbContact(contact)) {
            // If it is a FB Contact not linked it will be automatically linked
            // As now there is additional contact data entered by the user
            if (!fb.isFbLinked(contact)) {
              var fbContact = new fb.Contact(contact);
              // Here the contact has been promoted to linked but not saved yet
              fbContact.promoteToLinked();
            }

            setPropagatedFlag('givenName', deviceGivenName[0], contact);
            setPropagatedFlag('familyName', deviceFamilyName[0], contact);
            createName(contact);
          }
        } else {
          contact = utils.misc.toMozContact(myContact);
        }

        updateCategoryForImported(contact);

        var callbacks = cookMatchingCallbacks(contact);
        cancelHandler = doCancel.bind(callbacks);
        formHeader.addEventListener('action', cancelHandler);
        doMatch(contact, callbacks);
      });
    });
  }

  var cookMatchingCallbacks = function cookMatchingCallbacks(contact) {
    return {
      onmatch: function(results) {
        ExtServices.showDuplicateContacts();

        mergeHandler = function mergeHandler(e) {
          if (e.origin !== fb.CONTACTS_APP_ORIGIN) {
            return;
          }

          var data = e.data;
          switch (data.type) {
            case 'duplicate_contacts_loaded':
              // UI ready, passing duplicate contacts
              var duplicateContacts = {};
              Object.keys(results).forEach(function(id) {
                duplicateContacts[id] = {
                  matchingContactId: id,
                  matchings: results[id].matchings
                };
              });

              window.postMessage({
                type: 'show_duplicate_contacts',
                data: {
                  name: getCompleteName(getDisplayName(contact)),
                  duplicateContacts: duplicateContacts
                }
              }, fb.CONTACTS_APP_ORIGIN);

            break;

            case 'merge_duplicate_contacts':
              window.removeEventListener('message', mergeHandler);

              // List of duplicate contacts to merge (identifiers)
              var list = [];
              var ids = data.data;
              Object.keys(ids).forEach(id => {
                list.push(results[id]);
              });

              doMerge(contact, list, function finished() {
                // Contacts merged goes to contact list automatically without
                // saving, the merger does the live better to us
                if (ActivityHandler.currentlyHandling) {
                  ActivityHandler.postNewSuccess(contact);
                }

                window.postMessage({
                  type: 'duplicate_contacts_merged',
                  data: ids
                }, fb.CONTACTS_APP_ORIGIN);
              });

            break;

            case 'ready':
              // The list of duplicate contacts has been loaded
              formHeader.removeEventListener('action', cancelHandler);
              hideThrobber();
              window.setTimeout(Contacts.goBack, 300);

            break;

            case 'window_close':
              // If user igonores duplicate contacts we save the contact
              window.removeEventListener('message', mergeHandler);
              doSave(contact, true);

            break;
          }
        };

        window.addEventListener('message', mergeHandler);
      },
      onmismatch: function() {
        // Saving because there aren't duplicate contacts
        doSave(contact);
        formHeader.removeEventListener('action', cancelHandler);
      }
    };
  };

  function getCompleteName(contact) {
    var givenName = Array.isArray(contact.givenName) ?
                    contact.givenName[0] : '';

    var familyName = Array.isArray(contact.familyName) ?
                    contact.familyName[0] : '';

    var completeName = givenName && familyName ?
                       givenName + ' ' + familyName :
                       givenName || familyName;

    return completeName;
  }

  // Fills the contact data to display if no givenName and familyName
  function getDisplayName(contact) {
    if (hasName(contact)) {
      return { givenName: contact.givenName, familyName: contact.familyName };
    }

    var givenName = [];
    if (Array.isArray(contact.name) && contact.name.length > 0) {
      givenName.push(contact.name[0]);
    } else if (contact.org && contact.org.length > 0) {
      givenName.push(contact.org[0]);
    } else if (contact.tel && contact.tel.length > 0) {
      givenName.push(contact.tel[0].value);
    } else if (contact.email && contact.email.length > 0) {
      givenName.push(contact.email[0].value);
    } else {
      givenName.push(_('noName'));
    }

    return { givenName: givenName, modified: true };
  }

  function hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  }


  var doMerge = function doMerge(contact, list, cb) {
    var callbacks = {
      success: cb,
      error: function(e) {
        console.error('Failed merging duplicate contacts: ', e.name);
        cb();
      }
    };

    LazyLoader.load('/contacts/js/utilities/merge_helper.js', function() {
      MergeHelper.merge(contact, list).then(callbacks.success, callbacks.error);
    });
  };

  var doCancel = function doCancel() {
    formHeader.removeEventListener('action', cancelHandler);
    window.removeEventListener('message', mergeHandler);
    this.onmatch = this.onmismatch = null;
    window.postMessage({
      type: 'abort',
      data: ''
    }, fb.CONTACTS_APP_ORIGIN);
    hideThrobber();
  };

  var doMatch = function doMatch(contact, callbacks) {
    LazyLoader.load(['/shared/js/text_normalizer.js',
                     '/shared/js/simple_phone_matcher.js',
                     '/shared/js/contacts/contacts_matcher.js'], function() {
      Matcher.match(contact, 'active', callbacks);
    });
  };

  var doSave = function doSave(contact, noTransition) {
    // Deleting auxiliary objects created for dates
    delete contact.date;

    // When we add new contact, it has no id at the beginning. We have one, if
    // we edit current contact. We will use this information below.
    var isNew = contact.id !== 'undefined';

    ContactsService.save(
      utils.misc.toMozContact(contact),
      function(e) {
        if (e) {
          hideThrobber();
          console.error('Error saving contact', e);
          return;
        }
        hideThrobber();
        // Reloading contact, as it only allows to be updated once
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postNewSuccess(contact);
        }
        if (!noTransition) {
          Contacts.cancel();
        }

        // Since editing current contact returns to the details view, and adding
        // the new one to the contacts list, we call setCurrent() only in the
        // first case, so NFC listeners are not set on the Contact List
        // (Bug 1041455).
        if (isNew) {
          Contacts.setCurrent(contact);
        }
      }
    );
  };

  var showThrobber = function showThrobber() {
    throbber.classList.remove('hide');
  };

  var hideThrobber = function hideThrobber() {
    throbber.classList.add('hide');
  };

  /**
   * Creates a complete name from the received contact's `givenName` and
   * `familyName` fields.
   *
   * @param {object} contact MozContactObject to process
   */
  var createName = function createName(contact) {
    var givenName = '', familyName = '';

    if (Array.isArray(contact.givenName)) {
      givenName = contact.givenName[0].trim();
    }

    if (Array.isArray(contact.familyName)) {
      familyName = contact.familyName[0].trim();
    }

    var completeName = (givenName + ' ' + familyName).trim();
    contact.name = completeName ? [completeName] : [];
  };

  var setPropagatedFlag = function setPropagatedFlag(field, value, contact) {
    if (!Array.isArray(contact[field]) || !contact[field][0] ||
        !contact[field][0].trim()) {
      // Here the user is deleting completely the field then we get the
      // original facebook field value
      fb.setPropagatedFlag(field, contact);
      contact[field] = fbContact[field];
    } else if (contact[field][0] !== value) {
      // The user is changing the value of the field then we have a local field.
      // It implies not propagation
      fb.removePropagatedFlag(field, contact);
    }
  };

  function isBuiltInType(type, tagList) {
    return tagList.some(function(tag) {
      return tag.type === type;
    });
  }

  var getPhones = function getPhones(contact) {
    var selector = '#view-contact-form form div.phone-template:not(.facebook)';
    var phones = dom.querySelectorAll(selector);
    for (var i = 0; i < phones.length; i++) {
      var currentPhone = phones[i];
      var index = currentPhone.dataset.index;
      var numberField = dom.getElementById('number_' + index);
      var value = numberField.value;
      if (!value) {
        continue;
      }

      var type = [dom.getElementById('tel_type_' + index).dataset.value || ''];
      var carrierSelector = 'carrier_' + index;
      var carrier = dom.getElementById(carrierSelector).value || '';
      contact.tel = contact.tel || [];
      /*jshint -W075 */
      contact.tel.push({ value, type, carrier });
    }
  };

  var getEmails = function getEmails(contact) {
    var selector = '#view-contact-form form div.email-template:not(.facebook)';
    var emails = dom.querySelectorAll(selector);
    for (var i = 0; i < emails.length; i++) {
      var currentEmail = emails[i];
      var index = currentEmail.dataset.index;
      var emailField = dom.getElementById('email_' + index);
      var value = emailField.value;
      value = value && value.trim();
      if (!value) {
        continue;
      }

      var type = [
        dom.getElementById('email_type_' + index).dataset.value || ''];
      contact.email = contact.email || [];
      contact.email.push({ value, type });
    }
  };

  var getDates = function getDate(contact) {
    var selector = '#view-contact-form form div.date-template';
    var dates = dom.querySelectorAll(selector);
    var bdayVal = null, anniversaryVal = null;

    for (var i = 0; i < dates.length; i++) {
      var currentDate = dates[i];

      if (dates[i].classList.contains(FB_CLASS)) {
        continue;
      }

      var arrayIndex = currentDate.dataset.index;
      var dateField = dom.getElementById('date_' + arrayIndex);
      var dateValue = dateField.valueAsDate;

      selector = 'date_type_' + arrayIndex;
      var type = dom.getElementById(selector).dataset.value || '';
      if (!dateValue || !type) {
        continue;
      }

      // Date value is referred to current TZ but it is not needed to normalize
      // as that will be done only when the date is presented to the user
      // by calculating the corresponding offset
      switch (type) {
        case 'birthday':
          bdayVal = dateValue;
        break;
        case 'anniversary':
          anniversaryVal = dateValue;
        break;
      }
    }

    contact.bday = bdayVal;
    contact.anniversary = anniversaryVal;
  };

  var getAddresses = function getAddresses(contact) {
    var selector =
                '#view-contact-form form div.address-template:not(.facebook)';
    var addresses = dom.querySelectorAll(selector);
    for (var i = 0; i < addresses.length; i++) {
      var currentAddress = addresses[i];
      var arrayIndex = currentAddress.dataset.index;
      var addressField = dom.getElementById('streetAddress_' + arrayIndex);
      var addressValue = addressField.value || '';
      addressValue = addressValue.trim();
      selector = 'address_type_' + arrayIndex;
      var typeField = dom.getElementById(selector).dataset.value || '';
      typeField = typeField.trim();
      selector = 'locality_' + arrayIndex;
      var locality = dom.getElementById(selector).value || '';
      locality = locality.trim();
      selector = 'postalCode_' + arrayIndex;
      var postalCode = dom.getElementById(selector).value || '';
      postalCode = postalCode.trim();
      selector = 'countryName_' + arrayIndex;
      var countryName = dom.getElementById(selector).value || '';
      countryName = countryName.trim();

      // Sanity check for pameters, check all params but the typeField
      if (addressValue === '' && locality === '' &&
          postalCode === '' && countryName === '') {
        continue;
      }

      contact.adr = contact.adr || [];
      contact.adr.push({
        streetAddress: addressValue,
        postalCode: postalCode,
        locality: locality,
        countryName: countryName,
        type: [typeField]
      });
    }
  };

  var getNotes = function getNotes(contact) {
    var selector = '#view-contact-form form div.note-template';
    var notes = dom.querySelectorAll(selector);
    for (var i = 0; i < notes.length; i++) {
      var currentNote = notes[i];
      var arrayIndex = currentNote.dataset.index;
      var noteField = dom.getElementById('note_' + arrayIndex);
      var noteValue = noteField.value;
      noteValue = noteValue && noteValue.trim();
      if (!noteValue) {
        continue;
      }

      contact.note = contact.note || [];
      contact.note.push(noteValue);
    }
  };

  var resetForm = function resetForm() {
    currentPhoto = null;
    deletedTelNumber = false;

    thumbAction.querySelector('p').classList.remove('hide');
    var removeIcon = thumbAction.querySelector('button.' + IMG_DELETE_CLASS);
    if (removeIcon) {
      thumbAction.removeChild(removeIcon);
    }
    saveButton.removeAttribute('disabled');

    addNewDateButton.disabled = false;

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
    var dates = dom.querySelector('#contacts-form-dates');
    var notes = dom.querySelector('#contacts-form-notes');

    [phones, emails, addresses, dates, notes].forEach(
                                                    utils.dom.removeChildNodes);

    counters = {
      'tel': 0,
      'email': 0,
      'adr': 0,
      'date': 0,
      'note': 0
    };
    textFieldsCache.clear();
    formView.scrollTop = 0;
  };

  var resetRemoved = function cf_resetRemoved() {
    var removedFields = dom.querySelectorAll('.facebook');
    for (var i = 0; i < removedFields.length; i++) {
      removedFields[i].classList.remove(FB_CLASS);
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
      if ((textFields[i].value && textFields[i].value.trim()) ||
          (textFields[i].valueAsDate)) {
        return false;
      }
    }
    return true;
  };

  var removeFieldIcon = function removeFieldIcon(selector, type) {
    var delButton = document.createElement('button');

    delButton.className = IMG_DELETE_CLASS; // + ' fillflow-row-action';
    delButton.setAttribute('data-l10n-id', 'removeField');
    delButton.setAttribute('data-type', type);

    delButton.onclick = function removeElement(event) {
      // Workaround until 809452 is fixed.
      // What we are avoiding with this condition is removing / restoring
      // a field when the event is simulated by a ENTER Keyboard click
      if (event.clientX === 0 && event.clientY === 0) {
        return false;
      }
      event.preventDefault();
      var container = configs[type].container;
      var elem = document.getElementById(selector);

      if (type !== 'photo') {
        elem.parentNode.removeChild(elem);
        if (container.querySelectorAll('[data-field]').length === 0) {
          container.classList.add('empty');
        }
      }
      else {
        // TODO: Implement the new delete image flow
        console.warn('Delete image');
      }

      if (type === 'tel') {
        deletedTelNumber = true;
      }

      // Update the aria label for acessibility
      var delButton = event.target;
      delButton.setAttribute('data-l10n-id', 'removeField');

      counters[type]--;
      // In this version only two dates are allowed
      if (type === 'date') {
        checkAddDateButton();
      }

      textFieldsCache.clear();
      checkDisableButton();
    };

    return delButton;
  };

  var addRemoveIconToPhoto = function cf_addRemIconPhoto() {
    // Ensure the removed and FB class names are conveniently reseted
    thumbAction.classList.remove(FB_CLASS);

    var out = thumbAction.querySelector('button.' + IMG_DELETE_CLASS);
    if (!out) {
      out = removeFieldIcon(thumbAction.id, 'photo');
      thumbAction.appendChild(out);
    }
    else {
      // Ensure it is visible
      out.classList.remove('hide');
    }
    thumbAction.classList.add('with-photo');

    return out;
  };

  function canRemovePhoto() {
    var out = getCurrentPhoto() !== null;

    if (fb.isFbContact(currentContact)) {
      out = Array.isArray(deviceContact.photo) && deviceContact.photo[0];
    }

    return out;
  }

  function photoAction() {
    if (canRemovePhoto()) {
      removeOrUpdatePhoto();
    }
    else {
      pickImage();
    }
  }

  function removeOrUpdatePhoto() {
    LazyLoader.load('/contacts/js/action_menu.js', function() {
      var prompt = new ActionMenu('photo-options');
      prompt.addToList({id: 'remove-photo'}, removePhoto);

      prompt.addToList({id: 'change-photo'}, pickImage);

      prompt.show();
    });
  }

  function removePhoto() {
    currentPhoto = null;
    // If photo is removed, the FB photo of a contact is always restoredf
    if (fb.isFbContact(currentContact)) {
      // The local contact now does not have a photo
      deviceContact.photo = null;
      var fbPhoto = ContactPhotoHelper.getFullResolution(fbContact);
      utils.dom.updatePhoto(fbPhoto, thumb);
    }
    else {
      thumbAction.classList.remove('with-photo');
      utils.dom.updatePhoto(null, thumb);
    }

    if (!emptyForm()) {
      saveButton.removeAttribute('disabled');
    }
  }

  var pickImage = function pickImage() {
    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        maxFileSizeBytes: MAX_PHOTO_SIZE
      }
    });

    activity.onsuccess = function success() {
      addRemoveIconToPhoto();
      if (!emptyForm()) {
        saveButton.removeAttribute('disabled');
      }
      // XXX
      // this.result.blob is valid now, but it won't stay valid
      // (see https://bugzilla.mozilla.org/show_bug.cgi?id=806503)
      // And it might not be the size we want, anyway, so we make
      // our own copy that is at the right size.
      resizeBlob(this.result.blob, PHOTO_WIDTH, PHOTO_HEIGHT,
                 function(resized) {
                   utils.dom.updatePhoto(resized, thumb);
                   currentPhoto = resized;
                   if (fb.isFbContact(currentContact)) {
                     // We temporarily mark that there is a local photo chosen
                     deviceContact.photo = [currentPhoto];
                   }
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

    function cleanupImg() {
      img.src = '';
      URL.revokeObjectURL(url);
    }

    img.onerror = cleanupImg;

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
      var context = canvas.getContext('2d', { willReadFrequently: true });

      context.drawImage(img, x, y, w, h, 0, 0, target_width, target_height);
      cleanupImg();
      canvas.toBlob(function(resized) {
        context = null;
        canvas.width = canvas.height = 0;
        canvas = null;
        callback(resized);
      } , 'image/jpeg');
    };
  }

  return {
    'init': init,
    'render': render,
    'insertField': insertField,
    'saveContact': saveContact,
    'onNewFieldClicked': onNewFieldClicked
  };
})();
