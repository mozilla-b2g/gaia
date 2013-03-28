'use strict'

var NewContacts = (function() {
  var navigation = new navigationStack('view-contact-form');

  var showViewContactForm = function showViewContactForm(params) {
    var contactsForm = contacts.Form;
    if (params !== -1 && 'tel' in params) {
      contactsForm.render(params);
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

  var saveContact = function saveContact() {
    var contactsForm = contacts.Form;
    return contactsForm.saveContact();
  };

  var newField = function newField(evt) {
    var contactsForm = contacts.Form;
    return contactsForm.onNewFieldClicked(evt);
  };

  var initContainers = function initContainers() {
    var contactsForm = contacts.Form;
    var contactsTag = ContactsTag;
    var tagOptions = contactsTag.getTagOptions();
    contactsForm.init(tagOptions);
  };

  var initEventListeners = function initEventListener() {
    // Definition of elements and handlers
    utils.listeners.add({
      '#cancel-edit': handleCancel,
      '#contact-form button[data-field-type]': newField,
      '#save-button': saveContact,
      '#settings-cancel': handleBack,
      '#settings-done': doneTag,
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
    var contactsTag = ContactsTag;

    contactsWebActivity.setNavigation(navigation);
    contactsTag.loadTagOptions();
    initContainers();
    initEventListeners();
  };

  var showApp = function showApp() {
    document.body.classList.remove('hide');
  }

  return {
    'handleCancel': handleCancel,
    'initContacts': initContacts,
    'showViewContactForm': showViewContactForm,
    'showApp': showApp
  };
})();

window.addEventListener('localized', function initContacts(evt) {
  window.removeEventListener('localized', initContacts);

  var showViewContactForm = function showViewContactForm(activity) {
    var params = activity.source.data.params;
    var activityHandler = ActivityHandler;
    
    try {
      activityHandler._currentActivity = activity;
      NewContacts.initContacts();
      NewContacts.showViewContactForm(params);
      NewContacts.showApp();
    } catch(e) {
      console.error(e);
    } 
  };

  window.navigator.mozSetMessageHandler('activity', showViewContactForm);
});

document.addEventListener('mozvisibilitychange', function closeContactsActivity() {
  NewContacts.handleCancel();
});
