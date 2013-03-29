'use strict'

var UpdateContacts = (function() {
  var navigation = new navigationStack('view-contacts-list');

  var showViewContactForm = function showViewContactForm() {
    var contactsWebActivity = Contacts;
    var contactsForm = contacts.Form;
    var contactsList = contacts.List;
    var hasParams = window.location.hash.split('?');
    var hash = hasParams[0];
    var params = hasParams.length > 1 ?
                 contactsWebActivity.extractParams(hasParams[1]) : -1;
    var sectionId = hash.substr(1, hash.length) || '';

    var goViewContactForm = function goViewContactForm() {
      navigation.go('view-contact-form', 'popup');
    };

    switch (sectionId) {
      case 'view-contact-form':
        if ('id' in params) {
          var id = params['id'];
          contactsList.getContactById(id, function onSuccess(currentContact) {
            if ('extras' in params) {
              contactsWebActivity.addExtrasToContact(params['extras'], currentContact);
            }
            contactsForm.render(currentContact, goViewContactForm, null, params['fromUpdateActivity']);
          }, function onError() {
            console.log('Error retrieving contact to be edited');
            navigation.home();
          });
        }
        break;
    }
  };

  var handleBack = function handleBack() {
    navigation.back();
  };

  var handleCancel = function handleCancel() {
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postCancel();
    }
  };

  var saveContact = function saveContact() {
    var contactsForm = contacts.Form;
    return contactsForm.saveContact();
  };

  var newField = function newField(evt) {
    var contactsForm = contacts.Form;
    return contactsForm.onNewFieldClicked(evt);
  };

  var enterSearchMode = function enterSearchMode(evt) {
    var contactsList = contacts.List;

    contactsList.initSearch(function initSearch() {
      var contactsSearch = contacts.Search;
      contactsSearch.enterSearchMode(evt);
    });
  };

  var exitSearchMode = function exitSearchMode(evt) {
    var contactsSearch = contacts.Search;
    contactsSearch.exitSearchMode(evt);
  };

  var onCustomTagSelected = function onCustomTagSelected() {
    var contactsTag = ContactsTag;
    var selectedTag = contactsTag.getSelectedTag();

    if (selectedTag) {
      // Remove any mark if we had selected other option
      selectedTag.removeAttribute('class');
    }
    contactsTag.setSelectedTag(null);
  };

  var doneTag = function doneTag() {
    var contactsTag = ContactsTag;
    var selectedTag = contactsTag.getSelectedTag();
    var customTag = contactsTag.getCustomTag();
    var contactTag = contactsTag.getContactTag();

    if (selectedTag instanceof Object) {
      contactTag.textContent = selectedTag.textContent;
    } else if (customTag.value.length > 0) {
      contactTag.textContent = customTag.value;
    }
    contactsTag.setContactTag(null);
    handleBack();
  };

  var initContainers = function initContainers() {
    var contactsList = contacts.List;
    var contactsForm = contacts.Form;
    var _ = navigator.mozL10n.get;
    var list = document.getElementById('groups-list');
    var settingsButton = document.getElementById('settings-button');
    var cancelButton = document.getElementById('cancel_activity');
    var addButton = document.getElementById('add-contact-button');
    var appTitleElement = cancelButton.parentNode.querySelector('h1');
    var contactsTag = ContactsTag;
    var tagOptions = contactsTag.getTagOptions();

    cancelButton.classList.remove('hide');
    addButton.classList.add('hide');
    settingsButton.classList.add('hide');
    appTitleElement.textContent = _('selectContact');

    contactsForm.init(tagOptions);
    contactsList.init(list);
    contactsList.initAlphaScroll();
  };

  var initEventListeners = function initEventListener() {
    // Definition of elements and handlers
    utils.listeners.add({
      '#cancel_activity':handleCancel,
      '#cancel-edit': handleBack,
      '#contact-form button[data-field-type]': newField,
      '#save-button': saveContact,
      '#settings-cancel': handleBack,
      '#settings-done': doneTag,
      '#cancel-search': exitSearchMode,
      '#search-start': [
        {
          event: 'click',
          handler: enterSearchMode
        }
      ],
      // Bug 832861: Click event can't be synthesized correctly on customTag by
      // mouse_event_shim due to Gecko bug.  Use ontouchend here.
      '#custom-tag': [
        {
          event: 'touchend',
          handler: onCustomTagSelected
        }
      ]    
    });
  };

  var initContacts = function initContacts() {
    var contactsWebActivity = Contacts;

    contactsWebActivity.setNavigation(navigation);
    initContainers();
    initEventListeners();
  };

  var bindContactsListClickHandler = function bindContactsListClickHandler(phoneNumber, fromUpdateActivity) {
    var contactsList = contacts.List;

    var addToContactHandler = function addToContactHandler(id) {
      var contactsTag = ContactsTag;
      var tagOptions = contactsTag.getTagOptions();
      var data = {
        'tel': [{
          'value': phoneNumber,
          'carrier': null,
          'type': tagOptions['phone-type'][0].value
        }]
      };
      var hash = '#view-contact-form?extras=' +
      encodeURIComponent(JSON.stringify(data)) + '&id=' + id;

      hash += '&fromUpdateActivity=1';
      hash += '&timestamp=' + Date.now();
      window.location.hash = hash;
    };

    contactsList.clearClickHandlers();
    contactsList.handleClick(addToContactHandler);
  };

  var renderContactsList = function renderContactsList() {
    var contactsList = contacts.List;

    var render = function render(contacts) {    
      contactsList.load(contacts);
    }

    var onError = function onError() {
      console.error('Error getting first contacts');
    }

    contactsList.getAllContacts(onError, render);
  };

  return {
    'handleCancel': handleCancel,
    'showViewContactForm': showViewContactForm,
    'initContacts': initContacts,
    'renderContactsList': renderContactsList,
    'bindContactsListClickHandler': bindContactsListClickHandler
  };
})();

window.addEventListener('DOMContentLoaded', function renderContactsList() {
  UpdateContacts.renderContactsList();
});

window.addEventListener('localized', function initContacts() {
  window.removeEventListener('localized', initContacts);
  var contactsTag = ContactsTag;
  var fb = window.fb;

  var bindContactsListClickHandler = function bindContactsListClickHandler(activity) {
    var params = activity.source.data.params;
    var activityHandler = ActivityHandler;

    activityHandler._currentActivity = activity;
    if ('tel' in params) {
      UpdateContacts.bindContactsListClickHandler(params['tel'], true);
    }
  }

  try {
    contactsTag.loadTagOptions();
    fb.init(function() {
      UpdateContacts.initContacts();
    });
    window.navigator.mozSetMessageHandler('activity', bindContactsListClickHandler);
  } catch(e) {
    console.error(e);
  }
});

window.addEventListener('hashchange', UpdateContacts.showViewContactForm);

document.addEventListener('mozvisibilitychange', function closeContactsActivity() {
  UpdateContacts.handleCancel();
});
