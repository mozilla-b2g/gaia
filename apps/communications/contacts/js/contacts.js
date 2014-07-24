'use strict';
/* global ActivityHandler */
/* global contacts */
/* global ContactsTag */
/* global DatastoreMigration */
/* global fbLoader */
/* global LazyLoader */
/* global MozActivity */
/* global navigationStack */
/* global SmsIntegration */
/* global utils */
/* global TAG_OPTIONS */
/* global MessageBroadcaster */

/* exported COMMS_APP_ORIGIN */
/* exported SCALE_RATIO */
/* exported fbLoader */
/* jshint nonew: false */

var _;
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

  var messageBroadcaster = null;

  var contactTag,
      settings,
      settingsButton,
      cancelButton,
      addButton,
      appTitleElement,
      editModeTitleElement,
      asyncScriptsLoaded = false,
      viewParams;

  var settingsReady = false;
  var detailsReady = false;
  var displayed = false;

  var currentContact = {},
      currentFbContact;

  var contactsList;
  var contactsDetails;

  var customTag, customTagReset, tagDone, tagCancel, lazyLoadedTagsDom = false;

  var checkUrl = function checkUrl() {
    var hasParams = window.location.hash.split('?');
    var hash = hasParams[0];
    var sectionId = hash.substr(1, hash.length) || '';
    var params = hasParams.length > 1 ?
      utils.extractParams(hasParams[1]) : -1;

    switch (sectionId) {
      case 'view-contact-list':
        initContactsList();
        showApp();
        break;
      case 'view-contact-details':
        initContactsList();
        initDetails(function onInitDetails() {
          if (params == -1 || !('id' in params)) {
            console.error('Param missing');
            return;
          }
          var id = params.id;
          utils.getContactById(id, function onSuccess(savedContact) {
            currentContact = savedContact;
            contactsDetails.render(currentContact);
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
            goToForm();
            showApp();
          } else {
            // Editing existing contact
            if ('id' in params) {
              var paramsForUpdatedContact = {
                id: params.id
              };

              if ('extras' in params) {
                paramsForUpdatedContact.extras = params.extras;
              }

              showForm(true, paramsForUpdatedContact);
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

    Contacts.checkCancelableActivity();

  };

  var showApp = function showApp() {
    if (displayed) {
      return;
    }
    document.body.classList.remove('hide');
    displayed = true;
    utils.PerformanceHelper.visuallyComplete();
  };

  var initContainers = function initContainers() {
    settings = document.getElementById('view-settings');
    settingsButton = document.getElementById('settings-button');
    cancelButton = document.getElementById('cancel_activity');
    addButton = document.getElementById('add-contact-button');
    editModeTitleElement = document.getElementById('edit-title');
    appTitleElement = document.getElementById('app-title');
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

      initBroadcastedMessages();
      asyncScriptsLoaded = true;
    });
  };

  var init = function init() {
    _ = navigator.mozL10n.get;
    initContainers();
    initEventListeners();
    utils.PerformanceHelper.chromeInteractive();
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

    // Tell audio channel manager that we want to adjust the notification
    // channel if the user press the volumeup/volumedown buttons in Contacts.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
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
    } else {
      cancelButton.classList.add('hide');
      addButton.classList.remove('hide');
      settingsButton.classList.remove('hide');
    }

    text = (contactsList && contactsList.isSelecting)?
          _('selectContact'):_('contacts');

    if (appTitleElement.textContent !== text) {
      appTitleElement.textContent = text;
    }
  };


  var contactListClickHandler = function originalHandler(id) {
    initDetails(function onDetailsReady() {
      utils.getContactById(id, function findCb(contact, fbContact) {

        // Enable NFC listening is available
        if ('mozNfc' in navigator) {
          contacts.NFC.startListening(contact);
        }

        currentContact = contact;
        currentFbContact = fbContact;

        if (ActivityHandler.currentActivityIsNot(['import'])) {
          if (ActivityHandler.currentActivityIs(['pick'])) {
            ActivityHandler.dataPickHandler(currentFbContact || currentContact);
          }
          return;
        }

        contactsDetails.render(currentContact, currentFbContact);
        if (contacts.Search && contacts.Search.isInSearchMode()) {
          navigation.go('view-contact-details', 'go-deeper-search');
        } else {
          navigation.go('view-contact-details', 'go-deeper');
        }
      });
    });
  };

  var updateContactDetail = function updateContactDetail(id) {
    utils.getContactById(id, function findCallback(contact) {
      currentContact = contact;
      contactsDetails.render(currentContact);
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

  function showSelectTag() {
    var tagsList = document.getElementById('tags-list');
    var selectedTagType = contactTag.dataset.taglist;
    var options = TAG_OPTIONS[selectedTagType];
    var type = contactTag.type;
    var isCustomTagVisible = contactTag.customTagVisible;

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

  var goToSelectTag = function goToSelectTag(object) {
    contactTag = object;

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
        ActivityHandler.currentActivityIs(['open'])) {
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
    ContactsTag.clickDone(handleBack);
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
      console.error('WebActivities unavailable? : ' + e);
    }
  };

  var showAddContact = function showAddContact() {
    showForm();
  };

  var initForm = function c_initForm(callback) {
    Contacts.view('Form', function viewLoaded() {
        if (typeof callback === 'function') {
          callback();
        } else {
          goToForm();
        }
    });
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

  var showForm = function c_showForm(edit, params) {
    if (params && typeof params === 'object') {
      viewParams = params;
    } else {
      viewParams = null;
    }
    initForm(goToForm);
  };

  var setCurrent = function c_setCurrent(contact) {
    currentContact = contact;
    if ('mozNfc' in navigator && contacts.NFC) {
      contacts.NFC.startListening(contact);
    }
    if (contacts.Details) {
      contacts.Details.setContact(contact);
    }
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

  var showStatus = function c_showStatus(message, additional) {
    utils.status.show(message, additional);
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
      // For screen reader users
      '#search-start > input': [
        {
          event: 'focus',
          handler: enterSearchMode
        }
      ],
      'button[type="reset"]': stopPropagation
    });

  };

  var initBroadcastedMessages = function() {
    messageBroadcaster = new MessageBroadcaster();
    messageBroadcaster.on('go-to-select-tag', goToSelectTag);
    messageBroadcaster.on('set-current-contact', function(data) {
      utils.getContactById(data.id, setCurrent);
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
      '/contacts/js/broadcast_message.js',
      '/contacts/js/utilities/confirm_dialog.js',
      '/shared/js/contacts/utilities/templates.js',
      '/shared/js/contacts/contacts_shortcuts.js',
      '/contacts/js/contacts_tag.js',
      '/contacts/js/utilities/load_fb.js',
      '/contacts/js/utilities/others.js',
      '/contacts/js/tag_options.js',
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
      if (!ActivityHandler.currentlyHandling ||
          ActivityHandler.currentActivityIs(['pick', 'update'])) {
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
        if ((
          currView === 'view-contact-details' ||
          currView === 'view-contact-form'
        ) && currentContact != null &&
          currentContact.id == event.contactID) {
          utils.getContactById(event.contactID,
            function success(contact, enrichedContact) {
              currentContact = contact;
              if (contactsDetails) {
                contactsDetails.render(currentContact, enrichedContact);
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
    Contacts.onLocalized();
    if (window.navigator.mozSetMessageHandler && window.self == window.top) {
      var actHandler = ActivityHandler.handle.bind(ActivityHandler);
      window.navigator.mozSetMessageHandler('activity', actHandler);
    }

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

  /**
   * Specifies dependencies for resources
   * E.g., mapping Facebook as a dependency of views
   */
  var getDependencies = function(){
    return {
      views: {
        Settings: utils.loadFacebook,
        Details: utils.loadFacebook,
        Form: utils.loadFacebook
      },
      utilities: {},
      sharedUtilities: {}
    };
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

      // Form View is a separate module with it's own files now
      // so we load the HTML
      if (name === 'form') {

        loadFormView(callback);

      } else {
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
    }

    var dependencies = getDependencies();
    if (dependencies[type][file]) {
      return dependencies[type][file](doLoad);
    }

    doLoad();
  }

  // This is a temporary function to load Form view, when Haida
  // will be enabled we will not need it anymore
  var loadFormView = function(callback) {
    var name = 'form';
    var src = name + '.html';
    if (viewParams && typeof viewParams === 'object') {
      var params = [];
      for (var param in viewParams) {
        params.push(param + '=' + viewParams[param]);
      }
      src += '?' + params.join('&');
    }

    var iframe = document.querySelector(
      '#' + elementMapping[name] + ' iframe'
    );
    if (iframe.src !== src) {
      iframe.onload = callback;
      iframe.src = src;
    } else {
      // View already loaded
      callback();
    }
  };

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

  window.addEventListener('DOMContentLoaded', function onLoad() {
    utils.PerformanceHelper.domLoaded();
    window.removeEventListener('DOMContentLoaded', onLoad);
  });

  return {
    'goBack' : handleBack,
    'cancel': handleCancel,
    'goToSelectTag': goToSelectTag,
    'sendSms': sendSms,
    'navigation': navigation,
    'sendEmailOrPick': sendEmailOrPick,
    'checkCancelableActivity': checkCancelableActivity,
    'getLength': getLength,
    'showForm': showForm,
    'setCurrent': setCurrent,
    'onLocalized': onLocalized,
    'init': init,
    'showOverlay': showOverlay,
    'hideOverlay': hideOverlay,
    'showContactDetail': contactListClickHandler,
    'updateContactDetail': updateContactDetail,
    'showStatus': showStatus,
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
