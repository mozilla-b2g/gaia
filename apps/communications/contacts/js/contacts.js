'use strict';

var _ = navigator.mozL10n.get;
var TAG_OPTIONS;

var Contacts = (function() {
  var navigation = new navigationStack('view-contacts-list');

  var goToForm = function edit() {
    navigation.go('view-contact-form', 'popup');
  };

  var currentContactId,
      detailsName,
      givenName,
      company,
      familyName,
      selectedTag,
      customTag,
      contactTag,
      saveButton,
      editContactButton,
      settings,
      settingsButton,
      cancelButton,
      addButton,
      appTitleElement;

  var readyToPaint = false;
  var firstContacts = null;

  var currentContact = {},
      currentFbContact;

  var contactsList = contacts.List;
  var contactsDetails = contacts.Details;
  var contactsForm = contacts.Form;

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
          if (params['tel'])
            contactsDetails.reMark('tel', params['tel']);
          navigation.go(sectionId, 'right-left');
        }, function onError() {
          console.error('Error retrieving contact');
        });
        break;

      case 'view-contact-form':
        if (params == -1 || !('id' in params)) {
          contactsForm.render(params, goToForm);
        } else {
          // Editing existing contact
          if ('id' in params) {
            var id = params['id'];
            cList.getContactById(id, function onSuccess(savedContact) {
              currentContact = savedContact;
              // Check if we have extra parameters to render
              if ('extras' in params) {
                addExtrasToContact(params['extras']);
              }
              contactsForm.render(currentContact, goToForm);
            }, function onError() {
              console.log('Error retrieving contact to be edited');
              contactsForm.render(null, goToForm);
            });
          }
        }
        break;

      case 'add-parameters':
        navigation.home();
        if ('tel' in params) {
          selectList(params['tel']);
        }
        return;

    }

    if (!contactsList.loaded) {
      checkCancelableActivity();
      readyToPaint = true;
      if (firstContacts) {
        loadList(firstContacts);
        readyToPaint = false;
      }
    }

  };

  var addExtrasToContact = function addExtrasToContact(extrasString) {
    try {
      var extras = JSON.parse(decodeURIComponent(extrasString));
      for (var type in extras) {
        var extra = extras[type];
        if (currentContact[type]) {
          if (Array.isArray(currentContact[type])) {
            var joinArray = currentContact[type].concat(extra);
            currentContact[type] = joinArray;
          } else {
            currentContact[type] = extra;
          }
        } else {
          currentContact[type] = Array.isArray(extra) ? extra : [extra];
        }
      }
    } catch (e) {
      console.error('Extras malformed');
      return null;
    }
  };

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
  };

  var initContainers = function initContainers() {
    customTag = document.getElementById('custom-tag');
    settings = document.getElementById('view-settings');
    settingsButton = document.getElementById('settings-button');
    cancelButton = document.getElementById('cancel_activity');
    addButton = document.getElementById('add-contact-button');
    appTitleElement = cancelButton.parentNode.querySelector('h1');

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

  var onLocalized = function onLocalized() {
    initLanguages();
    initContainers();
    initContactsList();
    contactsDetails.init();
    contactsForm.init(TAG_OPTIONS);
    initEventListeners();
    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    document.body.classList.remove('hide');
  };

  var initContactsList = function initContactsList() {
    var list = document.getElementById('groups-list');
    contactsList.init(list);
    checkCancelableActivity();
  };

  var checkCancelableActivity = function cancelableActivity() {
    if (ActivityHandler.currentlyHandling) {
      cancelButton.classList.remove('hide');
      addButton.classList.add('hide');
      settingsButton.classList.add('hide');
      appTitleElement.textContent = _('selectContact');
    } else {
      cancelButton.classList.add('hide');
      addButton.classList.remove('hide');
      settingsButton.classList.remove('hide');
      appTitleElement.textContent = _('contacts');
    }
  };

  var initLanguages = function initLanguages() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  };

  var dataPickHandler = function dataPickHandler() {
    var type, dataSet, noDataStr, selectDataStr;
    var theContact = currentFbContact || currentContact;
    // Add the new pick type here:
    switch (ActivityHandler.activityDataType) {
      case 'webcontacts/contact':
        type = 'number';
        dataSet = theContact.tel;
        noDataStr = _('no_phones');
        selectDataStr = _('select_mobile');
        break;
      case 'webcontacts/email':
        type = 'email';
        dataSet = theContact.email;
        noDataStr = _('no_email');
        selectDataStr = _('select_email');
        break;
    }

    var hasData = dataSet && dataSet.length;
    var numOfData = hasData ? dataSet.length : 0;

    var result = {};
    result.name = theContact.name;
    switch (numOfData) {
      case 0:
        // If no required type of data
        var dismiss = {
          title: _('ok'),
          callback: ConfirmDialog.hide
        };
        ConfirmDialog.show(null, noDataStr, dismiss);
        break;
      case 1:
        // if one required type of data
        var data = dataSet[0].value;
        result[type] = data;
        ActivityHandler.postPickSuccess(result);
        break;
      default:
        // if more than one required type of data
        var prompt1 = new ValueSelector();
        for (var i = 0; i < dataSet.length; i++) {
          var data = dataSet[i].value,
              carrier = dataSet[i].carrier || '';
          prompt1.addToList(data + ' ' + carrier, data);
        }

        prompt1.onchange = function onchange(itemData) {
          prompt1.hide();
          result[type] = itemData;
          ActivityHandler.postPickSuccess(result);
        };
        prompt1.show();
    } // switch
  };

  var contactListClickHandler = function originalHandler(id) {
    contactsList.getContactById(id, function findCallback(contact, fbContact) {
      currentContact = contact;
      currentFbContact = fbContact;

      if (!ActivityHandler.currentlyHandling) {
        contactsDetails.render(currentContact, TAG_OPTIONS);
        navigation.go('view-contact-details', 'right-left');
        return;
      }

      dataPickHandler();
    });
  };

  var updateContactDetail = function updateContactDetail(id) {
    contactsList.getContactById(id, function findCallback(contact) {
      currentContact = contact;
      contactsDetails.render(currentContact, TAG_OPTIONS);
    });
  };

  var loadList = function loadList(contacts) {
    contactsList.load(contacts);
    contactsList.handleClick(contactListClickHandler);
  };

  var selectList = function selectList(phoneNumber) {
    var addButton = document.getElementById('add-contact-button');
    addButton.classList.add('hide');
    contactsList.clearClickHandlers();
    contactsList.load();
    contactsList.handleClick(function addToContactHandler(id) {
      var data = {
        'tel': [{
            'value': phoneNumber,
            'carrier': null,
            'type': TAG_OPTIONS['phone-type'][0].value
          }
        ]
      };
      window.location.hash = '#view-contact-form?extras=' +
        encodeURIComponent(JSON.stringify(data)) + '&id=' + id;
      contactsList.clearClickHandlers();
      contactsList.handleClick(contactListClickHandler);
      addButton.classList.remove('hide');
    });
  };

  var getLength = function getLength(prop) {
    if (!prop || !prop.length) {
      return 0;
    }
    return prop.length;
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
      var link = document.createElement('button');
      link.dataset.index = option;
      link.textContent = options[option].value;

      link.onclick = function(event) {
        var index = event.target.dataset.index;
        selectTag(event.target, tagList);
        event.preventDefault();
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
        selectedTag.removeAttribute('class');
      }
      selectedTag = null;
    };

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
      selectedTag.removeAttribute('class');
    }

    link.className = 'icon icon-selected';
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
    Contacts.goBack();
  };

  var sendSms = function sendSms(number) {
    if (!ActivityHandler.currentlyHandling)
      SmsIntegration.sendSms(number);
  };

  var callOrPick = function callOrPick(number) {
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postPickSuccess({ number: number });
    } else {
      TelephonyHelper.call(number);
    }
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

  var handleDetailsBack = function handleDetailsBack() {
    var hasParams = window.location.hash.split('?');
    var params = hasParams.length > 1 ?
      extractParams(hasParams[1]) : -1;

    navigation.back();
    // post message to parent page included Contacts app.
    if (params['back_to_previous_tab'] === '1') {
      window.parent.postMessage({ 'type': 'contactsiframe', 'message': 'back' }, '*');
    }
  };

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
  };

  // When a visiblity change is sent, handles and updates the
  // different views according to the app state
  var handleVisibilityChange = function handleVisibilityChange() {
    switch (navigation.currentView()) {
      case 'view-contact-details':
        if (!currentContact) {
          return;
        }
        contacts.List.load();
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
        contacts.List.load();
        contacts.List.getContactById(currentContact.id, function(contact) {
          if (!contact || isUpdated(contact, currentContact)) {
            return;
          }
          currentContact = contact;
          contactsDetails.render(currentContact, TAG_OPTIONS);
          navigation.back();
        });
        break;
      case 'view-contacts-list':
        contacts.List.load();
        break;
    }
  };

  var showAddContact = function showAddContact() {
    showForm();
  };

  var showEditContact = function showEditContact() {
    showForm(true);
  };

  var showForm = function c_showForm(edit) {
    var contact = edit ? currentContact : null;

    if (contact && fb.isFbContact(contact)) {
      var fbContact = new fb.Contact(contact);
      var req = fbContact.getDataAndValues();

      req.onsuccess = function() {
        contactsForm.render(contact, goToForm, req.result);
      };

      req.onerror = function() {
        contactsForm.render(contact, goToForm);
      };
    }
    else {
      contactsForm.render(contact, goToForm);
    }
  };

  var setCurrent = function c_setCurrent(contact) {
    currentContact = contact;
  };

  var showSettings = function showSettings() {
     // The number of FB Friends has to be recalculated
    contacts.Settings.refresh();
    navigation.go('view-settings', 'popup');
  };

  var stopPropagation = function stopPropagation(evt) {
    evt.preventDefault();
  };

  var initEventListeners = function initEventListener() {
    // Definition of elements and handlers
    utils.listeners.add({
      '#cancel_activity': handleCancel, // Activity (any) cancellation
      '#cancel-edit': handleCancel, // Cancel edition
      '#save-button': contacts.Form.saveContact,
      '#add-contact-button': showAddContact,
      '#settings-button': showSettings, // Settings related
      '#settings-cancel': handleBack,
      '#settings-done': doneTag,
      '#settings-close': contacts.Settings.close,
      '#cancel-search': contacts.Search.exitSearchMode, // Search related
      '#search-start': [
        {
          event: 'click',
          handler: contacts.Search.enterSearchMode
        }
      ],
      '#details-back': handleDetailsBack, // Details
      '#edit-contact-button': showEditContact,
      '#toggle-favorite': contacts.Details.toggleFavorite,
      '#contact-form button[data-field-type]': contacts.Form.onNewFieldClicked,
      'button[type="reset"]': stopPropagation
    });
  };

  var onLineChanged = function() {
    contacts.Settings.onLineChanged();
    contacts.Details.onLineChanged();
  };


  var cardStateChanged = function() {
    contacts.Settings.cardStateChanged();
  };


  var getFirstContacts = function c_getFirstContacts() {
    var onerror = function() {
      console.error('Error getting first contacts');
    };
    contacts.List.getAllContacts(onerror, function(contacts) {
      firstContacts = contacts;
      if (readyToPaint) {
        loadList(contacts);
        firstContacts = null;
      }
    });
  };

  window.addEventListener('load', function() {
    getFirstContacts();
  });

  return {
    'doneTag': doneTag,
    'goBack' : handleBack,
    'cancel': handleCancel,
    'goToSelectTag': goToSelectTag,
    'sendSms': sendSms,
    'callOrPick': callOrPick,
    'navigation': navigation,
    'sendEmailOrPick': sendEmailOrPick,
    'updatePhoto': updatePhoto,
    'checkCancelableActivity': checkCancelableActivity,
    'isEmpty': isEmpty,
    'getLength': getLength,
    'handleVisibilityChange': handleVisibilityChange,
    'showForm': showForm,
    'setCurrent': setCurrent,
    'getTags': TAG_OPTIONS,
    'onLocalized': onLocalized,
    'showOverlay': utils.overlay.show,
    'hideOverlay': utils.overlay.hide,
    'showContactDetail': contactListClickHandler,
    'updateContactDetail': updateContactDetail,
    'onLineChanged': onLineChanged,
    'showStatus': utils.status.show,
    'cardStateChanged': cardStateChanged
  };
})();

window.addEventListener('localized', function initContacts(evt) {
  window.removeEventListener('localized', initContacts);
  fb.init(function contacts_init() {
    Contacts.onLocalized();

    contacts.Settings.init();

    window.addEventListener('online', Contacts.onLineChanged);
    window.addEventListener('offline', Contacts.onLineChanged);

    // To listen to card state changes is needed for enabling import from SIM
    var mobileConn = navigator.mozMobileConnection;
    mobileConn.oncardstatechange = Contacts.cardStateChanged;

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
  }); // fb.init
}); // addEventListener
