/* global ContactPhotoHelper */
/* global ContactsTag */
/* global LazyLoader */
/* global Normalizer */
/* global utils */
/* global TAG_OPTIONS */
/* global ActionMenu */
/* global TagSelector */
/* global PhotoPicker */


/*
 * UI *must* work alone, without any 'Controller' tied. This will
 * help us to have a well-separated model, where the UI will dispatch
 * events that a Controller could potentially handle.
 *
 * UI will be in charge of rendering the info provided by 'Boot', which
 * is the only part of the code which knows UI & Controller.
 */

(function(exports) {
  'use strict';

  var counters = {
    'tel': 0,
    'email': 0,
    'adr': 0,
    'date': 0,
    'note': 0
  };

  // Cached elements that we will keep in memory
  var contactForm,
      deleteContactButton,
      addNewDateButton,
      thumb,
      thumbAction,
      saveButton,
      formHeader,
      formTitle,
      givenName,
      company,
      familyName,
      formView;


  var _, currentPhoto;

  var configs;
  function initConfigs() {
    // Keep in memory the template configuration
    configs = {
      'tel': {
        template: document.getElementById('add-phone-#i#'),
        tags: TAG_OPTIONS['phone-type'],
        fields: ['value', 'type', 'carrier'],
        container: document.getElementById('contacts-form-phones')
      },
      'email': {
        template: document.getElementById('add-email-#i#'),
        tags: TAG_OPTIONS['email-type'],
        fields: ['value', 'type'],
        container: document.getElementById('contacts-form-emails')
      },
      'adr': {
        template: document.getElementById('add-address-#i#'),
        tags: TAG_OPTIONS['address-type'],
        fields: [
          'type',
          'streetAddress',
          'postalCode',
          'locality',
          'countryName'
        ],
        container: document.getElementById('contacts-form-addresses')
      },
      'date': {
        template: document.getElementById('add-date-#i#'),
        tags: TAG_OPTIONS['date-type'],
        fields: ['value', 'type'],
        container: document.getElementById('contacts-form-dates')
      },
      'note': {
        template: document.getElementById('add-note-#i#'),
        tags: TAG_OPTIONS['address-type'],
        fields: ['note'],
        container: document.getElementById('contacts-form-notes')
      }
    };
  }

  // Let's get the right event for the current device
  var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';

  const INVALID_CLASS = 'invalid';
  const DELETE_BUTTON_CLASS = 'img-delete-button';

  function initContainers() {
    deleteContactButton = document.querySelector('#delete-contact');
    thumb = document.querySelector('#thumbnail-photo');
    thumbAction = document.querySelector('#thumbnail-action');
    saveButton = document.querySelector('#save-button');
    addNewDateButton = document.querySelector('#add-new-date');
    contactForm = document.getElementById('contact-form');
    formHeader = document.querySelector('#contact-form-header');
    formTitle = document.getElementById('contact-form-title');
    givenName = document.getElementById('givenName');
    company = document.getElementById('org');
    familyName = document.getElementById('familyName');
    formView = document.getElementById('view-contact-form');
  }

  function closeHandler() {
    window.dispatchEvent(new Event('close-ui'));
  }

  function addFieldHandler(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.target.dataset && e.target.dataset.action === 'delete') {
      return;
    }
    if (e.target.dataset && e.target.dataset.fieldType) {
      var type = e.target.dataset.fieldType;
      insertField(
        type,
        null,
        true
      );
    }
  }

  function saveHandler() {
    var contact = {};
    var inputs = { givenName, familyName };

    for (var field in inputs) {
      var value = inputs[field].value;
      if (value && value.length > 0) {
        contact[field] = [value];
      } else {
        contact[field] = null;
      }
    }

    if (company.value && company.value.length > 0) {
      contact.org = [company.value];
    }

    contact.email = getEmails();
    contact.tel = getPhones();
    contact.adr = getAddresses();
    contact.note = getNotes();
    var dates = getDates();
    contact.bday = dates.bday;
    contact.anniversary = dates.anniversary;
    contact.name = getName(contact);

    if (currentPhoto) {
      contact.photo = [currentPhoto];
    }

    var customEvent = new CustomEvent('save-contact', {'detail': contact});
    window.dispatchEvent(customEvent);
  }

  function addListeners() {
    thumbAction.querySelector('#photo-button').onclick = photoAction;

    document.addEventListener('input', function input(event) {
      checkDisableButton();
    });

    contactForm.addEventListener(touchstart, function click(event) {
      // Filter any other 'hit' in the DOM
      var target = event.target;
      if (target.tagName !== 'BUTTON') {
        return;
      }
      var action = target.dataset.action || target.getAttribute('type');
      switch(action) {
        case 'reset':
          event.preventDefault();
          var input = target.previousElementSibling;

          if (input.getAttribute('name').startsWith('tel') &&
              input.dataset.field === 'value') {

            var telId = input.id;
            var telIndex = telId.substring(telId.indexOf('_') + 1);
            var carrierField =
                          document.getElementById('carrier' + '_' + telIndex);
            carrierField.classList.add(INVALID_CLASS);

            cachedInputs = null;
          }
          input.value = '';
          checkDisableButton();
          break;
        case 'delete':
          event.preventDefault();
          event.stopPropagation();

          var type = target.dataset.type;
          var selector = target.dataset.selector;

          var container = configs[type].container;
          var elem = document.getElementById(selector);

          if (type !== 'photo') {
            // Remove field
            elem.parentNode.removeChild(elem);
            // Show empty if no more fields of the same type are available
            if (container.querySelectorAll('[data-field]').length === 0) {
              container.classList.add('empty');
            }
          }

          counters[type]--;
          // In this version only two dates are allowed
          if (type === 'date') {
            checkAddDateButton();
          }

          cachedInputs = null;
          // textFieldsCache.clear();
          checkDisableButton();
          break;
      }
    });

    thumbAction.addEventListener(touchstart, function click(event) {
      // Removing current photo
      if (event.target.tagName === 'BUTTON') {
        saveButton.removeAttribute('disabled');
      }
    });

    // 'ValueModified' comes from the 'TagSelector', and will return a value
    // from a set of Tags.
    formView.addEventListener('ValueModified', function onValueModified(event) {
      if (!event.detail) {
        return;
      }

      if (!emptyForm() && event.detail.prevValue !== event.detail.newValue) {
        saveButton.removeAttribute('disabled');
      }
    });

    formHeader.addEventListener('action', closeHandler);
    saveButton.addEventListener('click', saveHandler);
    contactForm.addEventListener('click', addFieldHandler);
  }

  function init() {
    // Cache l10n functionality
    _ = navigator.mozL10n.get;
    // Cache all DOM elements and reuse them
    initContainers();
    // Cache configuration for templates
    initConfigs();
    // Add listeners to DOM elements
    addListeners();
  }

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
      appendRemovePhotoButton();
    }

    utils.dom.updatePhoto(currentPhoto, thumb);
  }

  function render(params) {
    formView.classList.remove('skin-organic');
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
      params[field] && renderTemplate(field, params[field]);
    });

    checkDisableButton();
  }

 /**
   * Render Template
   *
   * @param {string} type Type of template, eg. 'tel'
   * @param {object[]} toRender
   */
  function renderTemplate(type, toRender) {
    if (!Array.isArray(toRender)) {
      toRender = [{value: toRender}];
    }

    for (var i = 0; i < toRender.length; i++) {
      insertField(type, toRender[i] || {});
    }
  }

  function checkAddDateButton() {
    addNewDateButton.disabled = (counters.date >= 2);
  }

  function checkCarrierTel(carrierInput, event) {
    var telInput = event.target;
    var value = telInput.value;

    if (!value || !value.trim()) {
      // deletedTelNumber = true;

      // If it was not previously filled then it will be disabled
      if (!telInput.dataset.wasFilled) {
        carrierInput.setAttribute('disabled', 'disabled');
      }
      else {
        // Otherwise marked as invalid in order not to submit it
        carrierInput.classList.add(INVALID_CLASS);
        cachedInputs = null;
        // textFieldsCache.clear();
      }
    }
    else {
      // Marked as filled
      telInput.dataset.wasFilled = true;
      // Enabling and marking as valid
      carrierInput.removeAttribute('disabled');
      carrierInput.classList.remove(INVALID_CLASS);
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

  function isBuiltInType(type, tagList) {
    return tagList.some(function(tag) {
      return tag.type === type;
    });
  }

  function insertField(type, object, isUserInteraction) {
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

      dateInput.addEventListener(
        'input',
        onInputDate.bind(null, dateInputText));
    }

    var removeEl = createDeleteButton(rendered.id, type);
    rendered.insertBefore(removeEl, rendered.firstChild);

    // Add event listeners
    var boxTitle = rendered.querySelector('legend.action');
    if (boxTitle) {
      boxTitle.addEventListener('click', selectTag);
    }

    // This will happen when the fields are added by the user on demand
    if (isUserInteraction) {
      rendered.classList.add('inserted');
      window.setTimeout(() => rendered.classList.add('displayed'));
    }

    container.classList.remove('empty');
    container.appendChild(rendered);
    counters[type]++;
    cachedInputs = null;

    // Finally we need to check the status of the add date button
    if (type === 'date') {
      checkAddDateButton();
    }
  }


  /*
   * Method for selecting a tag (i.e. "phone type"). This needs to handle
   * navigation among panels, that's why we need a 'MainNavigation' object
   */
  function selectTag(evt) {
    evt.preventDefault();
    var target = evt.currentTarget;
    LazyLoader.load('/contacts/js/utilities/tagSelector.js', function() {
      TagSelector.show(target.children[0]);
    });
    return false;
  }


  function getPhones(contact) {
    var phones = [];
    var selector = '#view-contact-form form div.phone-template';
    var phonesDOM = document.querySelectorAll(selector);
    for (var i = 0; i < phonesDOM.length; i++) {
      var currentPhone = phonesDOM[i];
      var index = currentPhone.dataset.index;
      var numberField = document.getElementById('number_' + index);
      var value = numberField.value;
      if (!value) {
        continue;
      }

      var type =
        [document.getElementById('tel_type_' + index).dataset.value || ''];
      var carrierSelector = 'carrier_' + index;
      var carrier = document.getElementById(carrierSelector).value || '';
      phones.push({ value, type, carrier });
    }
    return phones;
  }

  function getEmails() {
    var emails = [];
    var selector = '#view-contact-form form div.email-template';
    var emailsDOM = document.querySelectorAll(selector);
    for (var i = 0; i < emailsDOM.length; i++) {
      var currentEmail = emailsDOM[i];
      var index = currentEmail.dataset.index;
      var emailField = document.getElementById('email_' + index);
      var value = emailField.value;
      value = value && value.trim();
      if (!value) {
        continue;
      }

      var type = [
        document.getElementById('email_type_' + index).dataset.value || ''];
      emails.push({ value, type });
    }
    return emails;
  }

  function getName(contact) {
    var givenName = '', familyName = '';

    if (contact.givenName && Array.isArray(contact.givenName)) {
      givenName = contact.givenName[0].trim();
    }

    if (contact.familyName && Array.isArray(contact.familyName)) {
      familyName = contact.familyName[0].trim();
    }

    var completeName = (givenName + ' ' + familyName).trim();
    return completeName ? [completeName] : [];
  }

  function getDates(contact) {
    var dates = {};
    var selector = '#view-contact-form form div.date-template';
    var datesDOM = document.querySelectorAll(selector);
    var bdayVal = null, anniversaryVal = null;

    for (var i = 0; i < datesDOM.length; i++) {
      var currentDate = datesDOM[i];

      var arrayIndex = currentDate.dataset.index;
      var dateField = document.getElementById('date_' + arrayIndex);
      var dateValue = dateField.valueAsDate;

      selector = 'date_type_' + arrayIndex;
      var type = document.getElementById(selector).dataset.value || '';
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

    dates.bday = bdayVal;
    dates.anniversary = anniversaryVal;
    return dates;
  }

  function getAddresses(contact) {
    var addresses = [];
    var selector =
                '#view-contact-form form div.address-template';
    var addressesDOM = document.querySelectorAll(selector);
    for (var i = 0; i < addressesDOM.length; i++) {
      var currentAddress = addressesDOM[i];
      var arrayIndex = currentAddress.dataset.index;
      var addressField = document.getElementById('streetAddress_' + arrayIndex);
      var addressValue = addressField.value || '';
      addressValue = addressValue.trim();
      selector = 'address_type_' + arrayIndex;
      var typeField = document.getElementById(selector).dataset.value || '';
      typeField = typeField.trim();
      selector = 'locality_' + arrayIndex;
      var locality = document.getElementById(selector).value || '';
      locality = locality.trim();
      selector = 'postalCode_' + arrayIndex;
      var postalCode = document.getElementById(selector).value || '';
      postalCode = postalCode.trim();
      selector = 'countryName_' + arrayIndex;
      var countryName = document.getElementById(selector).value || '';
      countryName = countryName.trim();

      // Sanity check for pameters, check all params but the typeField
      if (addressValue === '' && locality === '' &&
          postalCode === '' && countryName === '') {
        continue;
      }

      addresses.push({
        streetAddress: addressValue,
        postalCode: postalCode,
        locality: locality,
        countryName: countryName,
        type: [typeField]
      });
    }
    return addresses;
  }

  function getNotes(contact) {
    var notes = [];
    var selector = '#view-contact-form form div.note-template';
    var notesDOM = document.querySelectorAll(selector);
    for (var i = 0; i < notesDOM.length; i++) {
      var currentNote = notesDOM[i];
      var arrayIndex = currentNote.dataset.index;
      var noteField = document.getElementById('note_' + arrayIndex);
      var noteValue = noteField.value;
      noteValue = noteValue && noteValue.trim();
      if (!noteValue) {
        continue;
      }

      notes.push(noteValue);
    }
    return notes;
  }


  function checkDisableButton() {
    var saveButton = document.getElementById('save-button');
    if (emptyForm()) {
      saveButton.setAttribute('disabled', 'disabled');
    } else {
      saveButton.removeAttribute('disabled');
    }
  }

  var cachedInputs = null;
  function emptyForm() {
    if (!cachedInputs) {
      cachedInputs =
        contactForm.querySelectorAll('input[data-field]:not(.invalid)');
    }

    for (var i = cachedInputs.length - 1; i >= 0; i--) {
      if ((cachedInputs[i].value && cachedInputs[i].value.trim()) ||
          (cachedInputs[i].valueAsDate)) {
        return false;
      }
    }

    return true;
  }

  function createDeleteButton(selector, type) {
    var delButton = document.createElement('button');
    delButton.className = DELETE_BUTTON_CLASS;
    delButton.setAttribute('data-l10n-id', 'removeField');
    delButton.dataset.type = type;
    delButton.dataset.action = 'delete';
    delButton.dataset.selector = selector;

    return delButton;
  }

  function appendRemovePhotoButton() {
    var button = thumbAction.querySelector('button.' + DELETE_BUTTON_CLASS);
    if (!button) {
      button = createDeleteButton(thumbAction.id, 'photo');
      thumbAction.appendChild(button);
    }
    else {
      // Ensure it is visible
      button.classList.remove('hide');
    }
    thumbAction.classList.add('with-photo');
  }

  function appendPhoto(resized) {
    appendRemovePhotoButton();
    if (!emptyForm()) {
      saveButton.removeAttribute('disabled');
    }
    utils.dom.updatePhoto(resized, thumb);
    currentPhoto = resized;
  }

  function photoAction() {
    if (!!currentPhoto) {
      removeOrUpdatePhoto();
    } else {
      LazyLoader.load(
      [
        '/contacts/views/form/js/photo_picker.js'
      ],
      function() {
        PhotoPicker.pick(appendPhoto);
      }
    );

    }
  }

  function removeOrUpdatePhoto() {
    LazyLoader.load(
      [
        '/contacts/views/form/js/photo_picker.js',
        '/contacts/js/action_menu.js'
      ],
      function() {
        var prompt = new ActionMenu('photo-options');
        prompt.addToList({id: 'remove-photo'}, removePhoto);

        prompt.addToList(
          {id: 'change-photo'},
          PhotoPicker.pick.bind(null, appendPhoto)
        );

        prompt.show();
      }
    );
  }

  function removePhoto() {
    currentPhoto = null;
    thumbAction.classList.remove('with-photo');
    utils.dom.updatePhoto(null, thumb);

    if (!emptyForm()) {
      saveButton.removeAttribute('disabled');
    }
  }

  window.FormUI = {
    'init': init,
    'render': render
  };
}(window));