'use strict';
/* global ActivityHandler */
/* global ConfirmDialog */
/* global contacts */
/* global ContactsTag */
/* global DatastoreMigration */
/* global fb */
/* global fbLoader */
/* global LazyLoader */
/* global MozActivity */
/* global navigationStack */
/* global PerformanceTestingHelper */
/* global SmsIntegration */
/* global utils */
/* exported COMMS_APP_ORIGIN */
/* exported SCALE_RATIO */
/* jshint nonew: false */

var _;
var TAG_OPTIONS;
var COMMS_APP_ORIGIN = location.origin;

// Scale ratio for different devices
var SCALE_RATIO = window.innerWidth / 320;

var Contacts = (function() {
  var SHARED = 'shared';
  var SHARED_PATH = '/' + SHARED + '/' + 'js';

  var SHARED_UTILS = 'sharedUtilities';
  var SHARED_UTILS_PATH = SHARED_PATH + '/contacts/import/utilities';

  var SHARED_CONTACTS = 'sharedContacts';
  var SHARED_CONTACTS_PATH = SHARED_PATH + '/' + 'contacts';

  var navigation = new navigationStack('view-contacts-list');

  var goToForm = function edit() {
    navigation.go('view-contact-form', 'popup');
  };

  var contactTag,
      settings,
      settingsButton,
      cancelButton,
      addButton,
      appTitleElement,
      editModeTitleElement,
      asyncScriptsLoaded = false;

  var settingsReady = false;
  var detailsReady = false;
  var formReady = false;
  var displayed = false;

  var currentContact = {},
      currentFbContact;

  var contactsList;
  var contactsDetails;
  var contactsForm;

  var customTag, customTagReset, tagDone, tagCancel, lazyLoadedTagsDom = false;

  // Shows the edit form for the current contact being in an update activity
  // It receives an array of two elements with the facebook data && values
  function showEditForm(facebookData, params) {
    contactsForm.render(currentContact, goToForm,
                                    facebookData, params.fromUpdateActivity);
    showApp();
  }

  var checkUrl = function checkUrl() {
    var hasParams = window.location.hash.split('?');
    var hash = hasParams[0];
    var sectionId = hash.substr(1, hash.length) || '';
    var cList = contacts.List;
    var params = hasParams.length > 1 ?
      utils.extractParams(hasParams[1]) : -1;

    switch (sectionId) {
      case 'view-contact-details':
        initContactsList();
        initDetails(function onInitDetails() {
          if (params == -1 || !('id' in params)) {
            console.log('Param missing');
            return;
          }
          var id = params.id;
          cList.getContactById(id, function onSuccess(savedContact) {
            currentContact = savedContact;
            contactsDetails.render(currentContact, TAG_OPTIONS);
            if (params.tel) {

              contactsDetails.reMark(
                'tel',
                params.tel,
                JSON.parse(params.isMissedCall) ? 'remark-missed' : 'remark'
              );
            }
            navigation.go(sectionId, 'right-left');
            showApp();
          }, function onError() {
            console.error('Error retrieving contact');
          });
        });
        break;
      case 'view-contact-form':
        initForm(function onInitForm() {
          if (params == -1 || !('id' in params)) {
            contactsForm.render(params, goToForm);
            showApp();
          } else {
            // Editing existing contact
            if ('id' in params) {
              var id = params.id;
              cList.getContactById(id, function onSuccess(savedContact) {
                currentContact = savedContact;
                // Check if we have extra parameters to render
                if ('extras' in params) {
                  addExtrasToContact(params.extras);
                }
                if (fb.isFbContact(savedContact)) {
                  var fbContact = new fb.Contact(savedContact);
                  var req = fbContact.getDataAndValues();
                  req.onsuccess = function() {
                    showEditForm(req.result, params);
                  };
                  req.onerror = function() {
                    console.error('Error retrieving FB information');
                    showEditForm(null, params);
                  };
                }
                else {
                  showEditForm(null, params);
                }
              }, function onError() {
                console.error('Error retrieving contact to be edited');
                contactsForm.render(null, goToForm);
                showApp();
              });
            }
          }
        });
        break;
      case 'add-parameters':
        initContactsList();
        initForm(function onInitForm() {
          navigation.home();
          if (ActivityHandler.currentlyHandling) {
            selectList(params, true);
          }
          showApp();
        });
        break;
      case 'home':
        navigation.home();
        showApp();
        break;
      default:
        showApp();
    }

  };

  var showApp = function showApp() {
    if (displayed) {
      return;
    }
    document.body.classList.remove('hide');
    displayed = true;
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

  var initContainers = function initContainers() {
    settings = document.getElementById('view-settings');
    settingsButton = document.getElementById('settings-button');
    cancelButton = document.getElementById('cancel_activity');
    addButton = document.getElementById('add-contact-button');
    editModeTitleElement = document.getElementById('edit-title');
    appTitleElement = document.getElementById('app-title');

    TAG_OPTIONS = {
      'phone-type' : [
        {type: 'mobile', value: _('mobile')},
        {type: 'home', value: _('home')},
        {type: 'work', value: _('work')},
        {type: 'personal', value: _('personal')},
        {type: 'faxHome', value: _('faxHome')},
        {type: 'faxOffice', value: _('faxOffice')},
        {type: 'faxOther', value: _('faxOther')},
        {type: 'other', value: _('other')}
      ],
      'email-type' : [
        {type: 'personal', value: _('personal')},
        {type: 'home', value: _('home')},
        {type: 'work', value: _('work')},
        {type: 'other', value: _('other')}
      ],
      'address-type' : [
        {type: 'current', value: _('current')},
        {type: 'home', value: _('home')},
        {type: 'work', value: _('work')}
      ],
      'date-type': [
        {type: 'birthday', value: _('birthday')},
        {type: 'anniversary', value: _('anniversary')}
      ]
    };
  };

  var onLocalized = function onLocalized() {
    init();

    addAsyncScripts();
    window.addEventListener('asyncScriptsLoaded', function onAsyncLoad() {
      asyncScriptsLoaded = true;
      window.removeEventListener('asyncScriptsLoaded', onAsyncLoad);
      if (contactsList) {
        contactsList.initAlphaScroll();
      }
      checkUrl();

      PerformanceTestingHelper.dispatch('init-finished');

      asyncScriptsLoaded = true;
    });
  };

  var init = function init() {
    _ = navigator.mozL10n.get;
    initContainers();
    initEventListeners();
    window.addEventListener('hashchange', checkUrl);

    // If the migration is not complete
    var config = utils.cookie.load();
    if (!config || !config.fbMigrated) {
      LazyLoader.load('js/fb/datastore_migrator.js', function() {
        new DatastoreMigration().start();
      });
    }
    else {
      window.console.info('FB Already migrated!!!');
    }
  };

  var initContactsList = function initContactsList() {
    if (contactsList) {
      return;
    }
    contactsList = contactsList || contacts.List;
    var list = document.getElementById('groups-list');
    contactsList.init(list);
    getFirstContacts();
    contactsList.initAlphaScroll();
    contactsList.handleClick(contactListClickHandler);
    checkCancelableActivity();
  };

  var checkCancelableActivity = function cancelableActivity() {
    // NOTE: Only set textContent below if necessary to avoid repaints at
    //       load time.  For more info see bug 725221.

    var text;
    if (ActivityHandler.currentlyHandling) {
      cancelButton.classList.remove('hide');
      addButton.classList.add('hide');
      settingsButton.classList.add('hide');

      text = _('selectContact');
      if (appTitleElement.textContent !== text) {
        appTitleElement.textContent = text;
      }
    } else if (contactsList && !contactsList.isSelecting) {
      cancelButton.classList.add('hide');
      addButton.classList.remove('hide');
      settingsButton.classList.remove('hide');

      text = _('contacts');
      if (appTitleElement.textContent !== text) {
        appTitleElement.textContent = text;
      }
    }
  };


  var contactListClickHandler = function originalHandler(id) {
    initDetails(function onDetailsReady() {
      contactsList.getContactById(id, function findCb(contact, fbContact) {

        // Enable NFC listening is available
        if ('mozNfc' in navigator) {
          contacts.NFC.startListening(contact);
        }

        currentContact = contact;
        currentFbContact = fbContact;
        if (ActivityHandler.currentlyHandling) {
          if (ActivityHandler.activityName == 'pick') {
            ActivityHandler.dataPickHandler(currentFbContact || currentContact);
          }
          return;
        }
        contactsDetails.render(currentContact, TAG_OPTIONS, currentFbContact);
        if (contacts.Search && contacts.Search.isInSearchMode()) {
          navigation.go('view-contact-details', 'go-deeper-search');
        } else {
          navigation.go('view-contact-details', 'go-deeper');
        }
      });
    });
  };

  var updateContactDetail = function updateContactDetail(id) {
    contactsList.getContactById(id, function findCallback(contact) {
      currentContact = contact;
      contactsDetails.render(currentContact, TAG_OPTIONS);
    });
  };

  var selectList = function selectList(params, fromUpdateActivity) {
    addButton.classList.add('hide');
    contactsList.clearClickHandlers();
    contactsList.handleClick(function addToContactHandler(id) {
      var data = {};
      if (params.hasOwnProperty('tel')) {
        var phoneNumber = params.tel;
        data.tel = [{
          'value': phoneNumber,
          'carrier': null,
          'type': [TAG_OPTIONS['phone-type'][0].type]
        }];
      }
      if (params.hasOwnProperty('email')) {
        var email = params.email;
        data.email = [{
          'value': email,
          'type': [TAG_OPTIONS['email-type'][0].type]
        }];
      }
      var hash = '#view-contact-form?extras=' +
        encodeURIComponent(JSON.stringify(data)) + '&id=' + id;
      if (fromUpdateActivity) {
        hash += '&fromUpdateActivity=1';
      }
      window.location.hash = hash;
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
    // Only for testing purposes
    dest.dataset.photoReady = 'true';
  };

  // Checks if an object fields are empty, by empty means
  // field is null and if it's an array it's length is 0
  var isEmpty = function isEmpty(obj, fields) {
    if (obj == null || typeof(obj) != 'object' ||
        !fields || !fields.length) {
      return true;
    }
    var attr;
    for (var i = 0; i < fields.length; i++) {
      attr = fields[i];
      if (obj[attr]) {
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

  function showSelectTag() {
    var tagsList = document.getElementById('tags-list');
    var selectedTagType = contactTag.dataset.taglist;
    var options = TAG_OPTIONS[selectedTagType];

    var type = selectedTagType.split('-')[0];
    var isCustomTagVisible = (document.querySelector(
      '[data-template]' + '.' + type + '-' +
      'template').dataset.custom != 'false');

    options = ContactsTag.filterTags(type, contactTag, options);

    if (!customTag) {
      customTag = document.querySelector('#custom-tag');
      customTag.addEventListener('keydown', handleCustomTag);
      customTag.addEventListener('touchend', handleCustomTag);
    }
    if (!customTagReset) {
      customTagReset = document.getElementById('custom-tag-reset');
      customTagReset.addEventListener('touchstart', handleCustomTagReset);
    }
    if (!tagDone) {
      tagDone = document.querySelector('#settings-done');
      tagDone.addEventListener('click', handleSelectTagDone);
    }
    if (!tagCancel) {
      tagCancel = document.querySelector('#settings-cancel');
      tagCancel.addEventListener('click', handleBack);
    }

    for (var i in options) {
      options[i].value = _(options[i].type);
    }

    ContactsTag.setCustomTag(customTag);
    // Set whether the custom tag is visible or not
    // This is needed for dates as we only support bday and anniversary
    // and not custom dates
    ContactsTag.setCustomTagVisibility(isCustomTagVisible);

    ContactsTag.fillTagOptions(tagsList, contactTag, options);

    navigation.go('view-select-tag', 'right-left');
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }

  var goToSelectTag = function goToSelectTag(event) {
    contactTag = event.currentTarget.children[0];

    var tagViewElement = document.getElementById('view-select-tag');
    if (!lazyLoadedTagsDom) {
      LazyLoader.load(tagViewElement, function() {
        navigator.mozL10n.translate(tagViewElement);
        showSelectTag();
        lazyLoadedTagsDom = true;
       });
    }
    else {
      showSelectTag();
    }
  };

  var sendSms = function sendSms(number) {
    if (!ActivityHandler.currentlyHandling ||
        ActivityHandler.activityName === 'open') {
      SmsIntegration.sendSms(number);
    }
  };

  var handleBack = function handleBack(cb) {
    navigation.back(cb);
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

  var handleSelectTagDone = function handleSelectTagDone() {
    var prevValue = contactTag.textContent;
    ContactsTag.clickDone(function() {
      var valueModifiedEvent = new CustomEvent('ValueModified', {
        bubbles: true,
        detail: {
          prevValue: prevValue,
          newValue: contactTag.textContent
        }
      });
      contactTag.dispatchEvent(valueModifiedEvent);
      handleBack();
    });
  };

  var handleCustomTag = function handleCustomTag(ev) {
    if (ev.keyCode === 13) {
      ev.preventDefault();
    }
    ContactsTag.touchCustomTag();
  };

  var handleCustomTagReset = function handleCustomTagReset(ev) {
    ev.preventDefault();
    if (customTag) {
      customTag.value = '';
    }
  };

  var sendEmailOrPick = function sendEmailOrPick(address) {
    try {
      // We don't check the email format, lets the email
      // app do that
      new MozActivity({
        name: 'new',
        data: {
          type: 'mail',
          URI: 'mailto:' + address
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  };

  var showAddContact = function showAddContact() {
    showForm();
  };

  var loadFacebook = function loadFacebook(callback) {
    if (!fbLoader.loaded) {
      fb.init(function onInitFb() {
        window.addEventListener('facebookLoaded', function onFbLoaded() {
          window.removeEventListener('facebookLoaded', onFbLoaded);
          callback();
        });
        fbLoader.load();
      });
    } else {
      callback();
    }
  };

  var initForm = function c_initForm(callback) {
    if (formReady) {
      callback();
    } else {
      initDetails(function onDetails() {
        LazyLoader.load([
          '/shared/js/contacts/utilities/image_thumbnail.js'],
        function() {
          Contacts.view('Form', function viewLoaded() {
            formReady = true;
            contactsForm = contacts.Form;
            contactsForm.init(TAG_OPTIONS);
            callback();
          });
        });
      });
    }
  };

  var initSettings = function c_initSettings(callback) {
    if (settingsReady) {
      callback();
    } else {
      Contacts.view('Settings', function viewLoaded() {
        LazyLoader.load(['/contacts/js/utilities/sim_dom_generator.js',
          '/contacts/js/utilities/icc_handler.js'], function() {
          settingsReady = true;
          contacts.Settings.init();
          callback();
        });
      });
    }
  };

  var initDetails = function c_initDetails(callback) {
    if (detailsReady) {
      callback();
    } else {
      Contacts.view('Details', function viewLoaded() {
        var simPickerNode = document.getElementById('sim-picker');
        LazyLoader.load([simPickerNode], function() {
          navigator.mozL10n.translate(simPickerNode);
          detailsReady = true;
          contactsDetails = contacts.Details;
          contactsDetails.init();
          callback();
        });
      });
    }
  };

  var showForm = function c_showForm(edit, contact) {
    currentContact = contact || currentContact;
    initForm(function onInit() {
      doShowForm(edit);
    });
  };

  var doShowForm = function c_doShowForm(edit) {
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

  var showOverlay = function c_showOverlay(message, progressClass, textId) {
    var out = utils.overlay.show(message, progressClass, textId);
    // When we are showing the overlay we are often performing other
    // significant work, such as importing.  While performing this work
    // it would be nice to avoid the overhead of any accidental reflows
    // due to touching the list DOM.  For example, importing incrementally
    // adds contacts to the list which triggers many reflows.  Therefore,
    // minimize this impact by hiding the list while we are showing the
    // overlay.
    contacts.List.hide();
    return out;
  };

  var hideOverlay = function c_hideOverlay() {
    Contacts.utility('Overlay', function _loaded() {
      contacts.List.show();
      utils.overlay.hide();
    }, SHARED_UTILS);
  };

  var showStatus = function c_showStatus(message) {
    utils.status.show(message);
  };

  var showSettings = function showSettings() {
    initSettings(function onSettingsReady() {
      // The number of FB Friends has to be recalculated
      contacts.Settings.refresh();
      navigation.go('view-settings', 'popup');
    });
  };

  var stopPropagation = function stopPropagation(evt) {
    evt.preventDefault();
  };

  var enterSearchMode = function enterSearchMode(evt) {
    Contacts.view('Search', function viewLoaded() {
      contacts.List.initSearch(function onInit() {
        contacts.Search.enterSearchMode(evt);
      });
    }, SHARED_CONTACTS);
  };

  var initEventListeners = function initEventListener() {
    // Definition of elements and handlers
    utils.listeners.add({
      '#cancel_activity': handleCancel, // Activity (any) cancellation
      '#add-contact-button': showAddContact,
      '#settings-button': showSettings, // Settings related
      '#search-start': [
        {
          event: 'click',
          handler: enterSearchMode
        }
      ],
      'button[type="reset"]': stopPropagation
    });
  };

  var onLineChanged = function() {
    Contacts.view('Settings', function viewLoaded() {
      contacts.Settings.onLineChanged();
    });
    Contacts.view('Details', function viewLoaded() {
      contacts.Details.onLineChanged();
    });
  };

  var getFirstContacts = function c_getFirstContacts() {
    var onerror = function() {
      console.error('Error getting first contacts');
    };
    contactsList = contactsList || contacts.List;

    contactsList.getAllContacts(onerror);
  };

  var addAsyncScripts = function addAsyncScripts() {
    var lazyLoadFiles = [
      '/shared/js/contacts/utilities/templates.js',
      '/shared/js/contacts/contacts_shortcuts.js',
      '/contacts/js/contacts_tag.js',
      SHARED_UTILS_PATH + '/' + 'misc.js',
      '/contacts/js/utilities/normalizer.js',
      '/shared/js/text_normalizer.js',
      '/dialer/js/telephony_helper.js',
      '/contacts/js/sms_integration.js',
      SHARED_UTILS_PATH + '/' + 'sdcard.js',
      SHARED_UTILS_PATH + '/' + 'vcard_parser.js',
      SHARED_UTILS_PATH + '/' + 'status.js',
      '/shared/js/contacts/utilities/dom.js'
    ];

    // Lazyload nfc.js if NFC is available
    if ('mozNfc' in navigator) {
      lazyLoadFiles.push('/contacts/js/nfc.js');
    }

    LazyLoader.load(lazyLoadFiles, function() {
      var handling = ActivityHandler.currentlyHandling;
      if (!handling || ActivityHandler.activityName === 'pick' ||
                       ActivityHandler.activityName === 'update') {
        initContactsList();
        checkUrl();
      } else {
        // Unregister here to avoid un-necessary list operations.
        navigator.mozContacts.oncontactchange = null;
      }
      window.dispatchEvent(new CustomEvent('asyncScriptsLoaded'));
    });
  };

  var pendingChanges = {};

  // This function is called when we finish a oncontactchange operation to
  // remove the op of the pending changes and check if we need to apply more
  // changes request over the same id.
  var checkPendingChanges = function checkPendingChanges(id) {
    var changes = pendingChanges[id];

    if (!changes) {
      return;
    }

    pendingChanges[id].shift();

    if (pendingChanges[id].length >= 1) {
      performOnContactChange(pendingChanges[id][0]);
    }
  };

  navigator.mozContacts.oncontactchange = function oncontactchange(event) {
    if (typeof pendingChanges[event.contactID] !== 'undefined') {
      pendingChanges[event.contactID].push({
        contactID: event.contactID,
        reason: event.reason
      });
    } else {
      pendingChanges[event.contactID] = [{
        contactID: event.contactID,
        reason: event.reason
      }];
    }

    // If there is already a pending request, don't do anything,
    // just wait to finish it in order
    if (pendingChanges[event.contactID].length > 1) {
      return;
    }

    performOnContactChange(event);
  };

  var performOnContactChange = function performOnContactChange(event) {
    initContactsList();
    var currView = navigation.currentView();
    switch (event.reason) {
      case 'update':
        if (currView == 'view-contact-details' && currentContact != null &&
          currentContact.id == event.contactID) {
          contactsList.getContactById(event.contactID,
            function success(contact, enrichedContact) {
              currentContact = contact;
              if (contactsDetails) {
                contactsDetails.render(currentContact, null, enrichedContact);
              }
              if (contactsList) {
                contactsList.refresh(enrichedContact || currentContact,
                                     checkPendingChanges, event.reason);
              }
          });
        } else {
          contactsList.refresh(event.contactID, checkPendingChanges,
            event.reason);
        }
        break;
      case 'create':
        contactsList.refresh(event.contactID, checkPendingChanges,
          event.reason);
        break;
      case 'remove':
        if (currentContact != null && currentContact.id == event.contactID &&
          (currView == 'view-contact-details' ||
          currView == 'view-contact-form')) {
          navigation.home();
        }
        contactsList.remove(event.contactID, event.reason);
        currentContact = {};
        checkPendingChanges(event.contactID);
        break;
    }
  };

  var close = function close() {
    window.removeEventListener('localized', initContacts);
  };

  var initContacts = function initContacts(evt) {
    window.setTimeout(Contacts.onLocalized);
    if (window.navigator.mozSetMessageHandler && window.self == window.top) {
      var actHandler = ActivityHandler.handle.bind(ActivityHandler);
      window.navigator.mozSetMessageHandler('activity', actHandler);
    }
    window.addEventListener('online', Contacts.onLineChanged);
    window.addEventListener('offline', Contacts.onLineChanged);

    document.addEventListener('visibilitychange', function visibility(e) {
      if (ActivityHandler.currentlyHandling && document.hidden) {
        ActivityHandler.postCancel();
        return;
      }
      Contacts.checkCancelableActivity();
      if (document.hidden === false &&
                                navigation.currentView() === 'view-settings') {
        Contacts.view('Settings', function viewLoaded() {
          contacts.Settings.updateTimestamps();
        });
      }
    });
  };

  navigator.mozL10n.once(initContacts);

  function loadConfirmDialog() {
    var args = Array.slice(arguments);
    Contacts.utility('Confirm', function viewLoaded() {
      ConfirmDialog.show.apply(ConfirmDialog, args);
    }, SHARED);
  }

  /**
   * Specifies dependencies for resources
   * E.g., mapping Facebook as a dependency of views
   */
  var dependencies = {
    views: {
      Settings: loadFacebook,
      Details: loadFacebook,
      Form: loadFacebook
    },
    utilities: {},
    sharedUtilities: {}
  };

  // Mapping of view names to element IDs
  // TODO: Having a more standardized way of specifying this would be nice.
  // Then we could get rid of this mapping entirely
  // E.g., #details-view, #list-view, #form-view
  var elementMapping = {
    details: 'view-contact-details',
    form: 'view-contact-form',
    settings: 'settings-wrapper',
    search: 'search-view',
    overlay: 'loading-overlay',
    confirm: 'confirmation-message'
  };

  function load(type, file, callback, path) {
    /**
     * Performs the actual lazy loading
     * Called once all dependencies are met
     */
    function doLoad() {
      var name = file.toLowerCase();
      var finalPath = 'js' + '/' + type;

      switch (path) {
        case SHARED:
          finalPath = SHARED_PATH;
          break;
        case SHARED_UTILS:
          finalPath = SHARED_UTILS_PATH;
          break;
        case SHARED_CONTACTS:
          finalPath = SHARED_CONTACTS_PATH;
          break;
        default:
          finalPath = 'js' + '/' + type;
      }

      var toLoad = [finalPath + '/' + name + '.js'];
      var node = document.getElementById(elementMapping[name]);
      if (node) {
        toLoad.unshift(node);
      }

      LazyLoader.load(toLoad, function() {
          if (node) {
            navigator.mozL10n.translate(node);
          }
          if (callback) {
            callback();
          }
        });
    }

    if (dependencies[type][file]) {
      return dependencies[type][file](doLoad);
    }

    doLoad();
  }

  /**
   * Loads a view from the views/ folder
   * @param {String} view name.
   * @param {Function} callback.
   */
  function loadView(view, callback, type) {
    load('views', view, callback, type);
  }

  /**
   * Loads a utility from the utilities/ folder
   * @param {String} utility name.
   * @param {Function} callback.
   */
  function loadUtility(utility, callback, type) {
    load('utilities', utility, callback, type);
  }

  var updateSelectCountTitle = function updateSelectCountTitle(count) {
    editModeTitleElement.textContent = _('SelectedTxt', {n: count});
  };

  return {
    'goBack' : handleBack,
    'cancel': handleCancel,
    'goToSelectTag': goToSelectTag,
    'sendSms': sendSms,
    'navigation': navigation,
    'sendEmailOrPick': sendEmailOrPick,
    'updatePhoto': updatePhoto,
    'checkCancelableActivity': checkCancelableActivity,
    'isEmpty': isEmpty,
    'getLength': getLength,
    'showForm': showForm,
    'setCurrent': setCurrent,
    'getTags': TAG_OPTIONS,
    'onLocalized': onLocalized,
    'init': init,
    'showOverlay': showOverlay,
    'hideOverlay': hideOverlay,
    'showContactDetail': contactListClickHandler,
    'updateContactDetail': updateContactDetail,
    'onLineChanged': onLineChanged,
    'showStatus': showStatus,
    'loadFacebook': loadFacebook,
    'confirmDialog': loadConfirmDialog,
    'close': close,
    'view': loadView,
    'utility': loadUtility,
    'updateSelectCountTitle': updateSelectCountTitle,
    get asyncScriptsLoaded() {
      return asyncScriptsLoaded;
    },
    get SHARED_UTILITIES() {
      return SHARED_UTILS;
    },
    get SHARED_CONTACTS() {
      return SHARED_CONTACTS;
    }
  };
})();
