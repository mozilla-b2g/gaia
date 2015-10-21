'use strict';
/* global ActivityHandler */
/* global Cache */
/* global contacts */
/* global DeferredActions */
/* global fb */
/* global fbLoader */
/* global LazyLoader */
/* global MainNavigation */
/* global Loader */
/* global TAG_OPTIONS */
/* global utils */
/* global GaiaHeader */
/* global GaiaSubheader */
/* global HeaderUI */
/* global Search */
/* global ContactsService */
/* global ParamUtils */

/* exported COMMS_APP_ORIGIN */
/* exported SCALE_RATIO */

/* jshint nonew: false */

var COMMS_APP_ORIGIN = location.origin;

// Scale ratio for different devices
var SCALE_RATIO = window.devicePixelRatio || 1;

var Contacts = (function() {

  var goToForm = function edit() {
    var transition = ActivityHandler.currentlyHandling ? 'activity-popup'
                                                       : 'fade-in';
    MainNavigation.go('view-contact-form', transition);
  };

  var loadAsyncScriptsDeferred = {};
  loadAsyncScriptsDeferred.promise = new Promise((resolve) => {
    loadAsyncScriptsDeferred.resolve = resolve;
  });

  var settingsReady = false;
  var detailsReady = false;
  var formReady = false;

  var currentContact = {};

  var contactsList;
  var contactsDetails;
  var contactsForm;

  // Shows the edit form for the current contact being in an update activity
  // It receives an array of two elements with the facebook data && values
  function showEditForm(facebookData, params) {
    contactsForm.render(currentContact, goToForm,
                        facebookData, params.fromUpdateActivity);
  }

  var checkUrl = function checkUrl() {
    var hasParams = window.location.hash.split('?');
    var hash = hasParams[0];
    var sectionId = hash.substr(1, hash.length) || '';
    var params = hasParams.length > 1 ?
      utils.extractParams(hasParams[1]) : -1;

    switch (sectionId) {
      case 'view-contact-list':
        initContactsList();
        break;
      case 'view-contact-details':
        initContactsList();
        initDetails(function onInitDetails() {
          // At this point, a parameter is required
          if (params == -1) {
            console.error('Param missing');
            return;
          }

          // If the parameter is an id, the corresponding contact is loaded
          // from the device.
          if ('id' in params) {
            var id = params.id;
            ContactsService.get(id, function onSuccess(savedContact) {
              currentContact = savedContact;

              contactsDetails.render(currentContact);

              MainNavigation.go(sectionId, 'right-left');
            }, function onError() {
              console.error('Error retrieving contact');
            });
          // If mozContactParam is true, we know there is a mozContact
          // attached to the activity, so we render it using contacts details'
          // read only mode. This is used when we receive an activity to open
          // a given contact with allowSave set to false.
          } else if (params.mozContactParam) {
            var contact = ActivityHandler.mozContactParam;
            contactsDetails.render(contact, null, true);
            MainNavigation.go(sectionId, 'activity-popup');
          }
        });
        break;
      case 'view-contact-form':
        initForm(function onInitForm() {
          if (params.mozContactParam) {
            contactsForm.render(ActivityHandler.mozContactParam, goToForm);
            ActivityHandler.mozContactParam = null;
          } else if (params == -1 || !(params.id)) {
            contactsForm.render(params, goToForm);
          } else {
            // Editing existing contact
            if (params.id) {
              var id = params.id;
              ContactsService.get(id, function onSuccess(savedContact) {
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
              });
            }
          }
        });
        break;
      case 'add-parameters':
        initContactsList();
        if (ActivityHandler.currentlyHandling) {
          selectList(params, true);
        }
        break;
      case 'multiple-select-view':
        Loader.view('multiple_select', () => {
          MainNavigation.go('multiple-select-view', 'activity-popup');
        });
        break;
      case 'home':
        MainNavigation.home();
        break;
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

  var onLocalized = function onLocalized() {
    init();

    // We need to return the promise here for testing purposes
    return addAsyncScripts().then(() => {
      checkUrl();
      if (!ActivityHandler.currentlyHandling ||
          ActivityHandler.currentActivityIs(['pick', 'update'])) {
        initContactsList();
      } else {
        // Unregister here to avoid un-necessary list operations.
        ContactsService.removeListener('contactchange', oncontactchange);
      }

      if (contactsList) {
        contactsList.initAlphaScroll();
      }
    });
  };

  var loadDeferredActions = function loadDeferredActions() {
    window.removeEventListener('listRendered', loadDeferredActions);
    LazyLoader.load([
      'js/deferred_actions.js',
      '/contacts/js/fb_loader.js',
      '/contacts/js/fb/fb_init.js'
    ], function() {
      DeferredActions.execute();
    });
  };

  var init = function init() {
    window.addEventListener('hashchange', checkUrl);

    window.addEventListener('listRendered', loadDeferredActions);

    /* Tell the audio channel manager that we want to adjust the "notification"
     * channel when the user presses the volumeup/volumedown buttons. */
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
    ActivityHandler.isCancelable().then(isCancelable => {
      HeaderUI.updateHeader(isCancelable);
    });
  };

  var contactListClickHandler = function originalHandler(id) {

    if (!ActivityHandler.currentlyHandling) {
      window.location.href = ParamUtils.generateUrl('detail', {contact:id});
      return;
    }

    ContactsService.get(id, function findCb(contact) {
      currentContact = contact;
      if (ActivityHandler.currentActivityIsNot(['import'])) {
        if (ActivityHandler.currentActivityIs(['pick'])) {
          ActivityHandler.dataPickHandler(currentContact);
        }
        return;
      }

      window.location.href = ParamUtils.generateUrl('detail', {contact:id});
    });
  };

  var updateContactDetail = function updateContactDetail(id) {
    ContactsService.get(id, function findCallback(contact) {
      currentContact = contact;
      contactsDetails.render(currentContact);
    });
  };

  var selectList = function selectList(params, fromUpdateActivity) {
    HeaderUI.hideAddButton();
    contactsList.clearClickHandlers();
    contactsList.handleClick(function addToContactHandler(id) {

      var optionalParams;

      if (params.hasOwnProperty('tel')) {
        optionalParams = {
          action: 'update',
          contact: id,
          isActivity: true,
          tel: params.tel
        };
      }

      if (params.hasOwnProperty('email')) {
        optionalParams = {
          action: 'update',
          contact: id,
          isActivity: true,
          email: params.email
        };
      }

      window.location.href = ParamUtils.generateUrl(
        'form',
        optionalParams
      );
    });
  };

  var handleBack = function handleBack(cb) {
    MainNavigation.back(cb);
  };

  var handleCancel = function handleCancel() {
    //If in an activity, cancel it
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postCancel();
      MainNavigation.home();
    } else {
      handleBack(function() {
        // TODO: remove all interaction with detail.js when it works
        // as an independent view
        if (MainNavigation.currentView() === 'view-contact-details') {
          contactsDetails.startNFC(currentContact);
        }
      });
    }
  };

  var showAddContact = function showAddContact() {
    window.location.href = ParamUtils.generateUrl('form',{action: 'new'});
  };

  var loadFacebook = function loadFacebook(callback) {
    LazyLoader.load([
      '/contacts/js/fb_loader.js',
      '/contacts/js/fb/fb_init.js'
    ], () => {
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
    });
  };

  var initForm = function c_initForm(callback) {
    if (formReady) {
      callback();
    } else {
      initDetails(function onDetails() {
        LazyLoader.load([
          '/shared/js/contacts/import/utilities/misc.js',
          '/shared/js/contacts/utilities/image_thumbnail.js',
          '/contacts/js/match_service.js'],
        function() {
          Loader.view('Form', function viewLoaded() {
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
      Loader.view('Settings', function viewLoaded() {
        LazyLoader.load(['/contacts/js/utilities/sim_dom_generator.js',
          '/contacts/js/utilities/normalizer.js',
          '/shared/js/contacts/import/utilities/misc.js',
          '/shared/js/mime_mapper.js',
          '/shared/js/contacts/import/utilities/vcard_parser.js',
          '/contacts/js/utilities/icc_handler.js',
          '/shared/js/contacts/import/utilities/sdcard.js',
          '/shared/elements/gaia_switch/script.js',
          '/shared/js/date_time_helper.js'], function() {
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
      Loader.view('Details', function viewLoaded() {
        LazyLoader.load(
          ['/shared/js/contacts/import/utilities/misc.js',
           '/dialer/js/telephony_helper.js',
           '/shared/js/contacts/sms_integration.js',
           '/shared/js/contacts/contacts_buttons.js',
           '/contacts/js/match_service.js'],
        function() {
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

    if (contacts.Details) {
      contacts.Details.setContact(contact);
    }
  };

  var showOverlay = function c_showOverlay(messageId, progressClass, textId) {
    var out = utils.overlay.show(messageId, progressClass, textId);
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
    Loader.utility('Overlay', function _loaded() {
      contacts.List.show();
      utils.overlay.hide();
    });
  };

  var showSettings = function showSettings() {
    initSettings(function onSettingsReady() {
      // The number of FB Friends has to be recalculated
      contacts.Settings.refresh();
      MainNavigation.go('view-settings', 'fade-in');
    });
  };

  var stopPropagation = function stopPropagation(evt) {
    evt.preventDefault();
  };

  var enterSearchMode = function enterSearchMode(evt) {
    Loader.view('Search', function viewLoaded() {
      contacts.List.initSearch(function onInit() {
        Search.enterSearchMode(evt);
      });
    });
  };

  var initEventListeners = function initEventListener() {
    // Definition of elements and handlers
    utils.listeners.add({
      '#contacts-list-header': [
        {
          event: 'action',
          handler: handleCancel // Activity (any) cancellation
        }
      ],
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
      '/contacts/js/tag_options.js',
      '/contacts/js/loader.js',
      '/shared/js/text_normalizer.js',
      '/shared/js/contacts/import/utilities/status.js',
      '/shared/js/contacts/utilities/dom.js',
      '/shared/js/confirm.js',
      document.getElementById('confirmation-message')
    ];

    LazyLoader.load(lazyLoadFiles, function() {
      loadAsyncScriptsDeferred.resolve();
    });
    return loadAsyncScriptsDeferred.promise;
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

  var oncontactchange = function oncontactchange(event) {
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


  ContactsService.addListener('contactchange', oncontactchange);

  var performOnContactChange = function performOnContactChange(event) {
    // To be on the safe side for now we evict the cache everytime a
    // contact change event is received. In the future, we may want to check
    // if the change affects the cache or not, so we avoid evicting it when
    // is not needed.
    Cache.evict();
    initContactsList();
    var currView = MainNavigation.currentView();
    switch (event.reason) {
      case 'update':
        if (currView == 'view-contact-details' && currentContact != null &&
          currentContact.id == event.contactID) {
          ContactsService.get(event.contactID,
            function success(contact, enrichedContact) {
              currentContact = contact;
              if (contactsDetails) {
                contactsDetails.render(currentContact, enrichedContact);
              }
              if (contactsList) {
                contactsList.refresh(enrichedContact || currentContact,
                                     checkPendingChanges, event.reason);
              }
              notifyContactChanged(event.contactID, event.reason);
          });
        } else {
          refreshContactInList(event.contactID);
        }
        break;
      case 'create':
        refreshContactInList(event.contactID);
        break;
      case 'remove':
        if (currentContact != null && currentContact.id == event.contactID &&
          (currView == 'view-contact-details' ||
          currView == 'view-contact-form')) {
          MainNavigation.home();
        }
        contactsList.remove(event.contactID, event.reason);
        currentContact = {};
        checkPendingChanges(event.contactID);
        notifyContactChanged(event.contactID, event.reason);
        break;
      case 'merged':
        contactsList.remove(event.contactID);
        notifyContactChanged(event.contactID, 'remove');
        break;
    }
  };

  // Refresh a contact in the list, and notifies of contact
  // changed to possible listeners.
  function refreshContactInList(id) {
    contactsList.refresh(id, function() {
      notifyContactChanged(id);
      checkPendingChanges(id);
    });
  }

  // Send a custom event when we know that a contact changed and
  // the contact list was updated.
  // Used internally in places where the contact list is a reference
  function notifyContactChanged(id, reason) {
    document.dispatchEvent(new CustomEvent('contactChanged', {
      detail: {
        contactID: id,
        reason: reason
      }
    }));
  }

  var close = function close() {
    window.removeEventListener('localized', initContacts);
  };

  var initContacts = function initContacts(evt) {
    initEventListeners();
    utils.PerformanceHelper.contentInteractive();
    utils.PerformanceHelper.chromeInteractive();
    window.setTimeout(Contacts && Contacts.onLocalized);
    if (window.navigator.mozSetMessageHandler && window.self == window.top) {
      LazyLoader.load(['/shared/js/contacts/import/utilities/misc.js',
        '/shared/js/contacts/import/utilities/vcard_reader.js',
        '/shared/js/contacts/import/utilities/vcard_parser.js'],
       function() {
        var actHandler = ActivityHandler.handle.bind(ActivityHandler);
        window.navigator.mozSetMessageHandler('activity', actHandler);
      });
    }

    document.addEventListener('visibilitychange', function visibility(e) {
      if (document.hidden === false &&
          MainNavigation.currentView() === 'view-settings') {
        Loader.view('Settings', function viewLoaded() {
          contacts.Settings.updateTimestamps();
        });
      }
    });
  };

  LazyLoader.load('/shared/js/l10n.js', () => {
    navigator.mozL10n.once(() => {
      initContacts();
    });
    navigator.mozL10n.ready(() => {
      Cache.maybeEvict();
    });
    LazyLoader.load('/shared/js/l10n_date.js');
  });

  window.addEventListener('DOMContentLoaded', function onLoad() {
    window.removeEventListener('DOMContentLoaded', onLoad);
  });

  sessionStorage.setItem('contactChanges', null);
  window.addEventListener('pageshow', function onPageshow() {

    window.dispatchEvent(new CustomEvent('list-shown'));

    // XXX: Workaround until the platform will be fixed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1184953
    document.registerElement(
      'gaia-header',
      { prototype: GaiaHeader.prototype }
    );
    document.registerElement(
      'gaia-subheader',
      { prototype: GaiaSubheader.prototype }
    );

    // XXX: As well we need to get back the theme color
    // due to the bug with back&forward cache mentioned before
    var meta = document.querySelector('meta[name="theme-color"]');
    document.head.removeChild(meta);
    meta = document.createElement('meta');
    meta.content = 'var(--header-background)';
    meta.name = 'theme-color';
    document.head.appendChild(meta);

    // #new handling
    var eventsStringified = sessionStorage.getItem('contactChanges');
    if (!eventsStringified || eventsStringified === 'null') {
      return;
    }
    
    var changeEvents = JSON.parse(eventsStringified);
    for (var i = 0; i < changeEvents.length; i++) {
      performOnContactChange(changeEvents[i]);
    }
    sessionStorage.setItem('contactChanges', null);
  });

  return {
    'goBack' : handleBack,
    'cancel': handleCancel,
    'setCurrent': setCurrent,
    'showForm': showForm,
    'onLocalized': onLocalized,
    'init': init,
    'showOverlay': showOverlay,
    'hideOverlay': hideOverlay,
    'showContactDetail': contactListClickHandler,
    'updateContactDetail': updateContactDetail,
    'loadFacebook': loadFacebook,
    'close': close,
    get asyncScriptsLoaded() {
      return loadAsyncScriptsDeferred.promise;
    }
  };
})();
