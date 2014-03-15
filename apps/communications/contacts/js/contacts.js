'use strict';

var _;
var TAG_OPTIONS;
var COMMS_APP_ORIGIN = document.location.protocol + '//' +
  document.location.host;
var asyncScriptsLoaded;

// Scale ratio for different devices
var SCALE_RATIO = window.innerWidth / 320;

var Contacts = (function() {
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
          var id = params['id'];
          cList.getContactById(id, function onSuccess(savedContact) {
            currentContact = savedContact;
            contactsDetails.render(currentContact, TAG_OPTIONS);
            if (params['tel'])
              contactsDetails.reMark('tel', params['tel']);
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
              var id = params['id'];
              cList.getContactById(id, function onSuccess(savedContact) {
                currentContact = savedContact;
                // Check if we have extra parameters to render
                if ('extras' in params) {
                  addExtrasToContact(params['extras']);
                }
                contactsForm.render(currentContact, goToForm,
                                    null, params['fromUpdateActivity']);
                showApp();
              }, function onError() {
                console.log('Error retrieving contact to be edited');
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
    appTitleElement = cancelButton.parentNode.querySelector('h1');

    TAG_OPTIONS = {
      'phone-type' : [
        {type: 'mobile', value: _('mobile')},
        {type: 'home', value: _('home')},
        {type: 'work', value: _('work')},
        {type: 'personal', value: _('personal')},
        {type: 'faxHome', value: _('faxHome')},
        {type: 'faxOffice', value: _('faxOffice')},
        {type: 'faxOther', value: _('faxOther')},
        {type: 'another', value: _('another')}
      ],
      'email-type' : [
        {type: 'personal', value: _('personal')},
        {type: 'home', value: _('home')},
        {type: 'work', value: _('work')}
      ],
      'address-type' : [
        {type: 'home', value: _('home')},
        {type: 'work', value: _('work')}
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
    initLanguages();
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
    if (contactsList)
      return;
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

    if (ActivityHandler.currentlyHandling) {
      cancelButton.classList.remove('hide');
      addButton.classList.add('hide');
      settingsButton.classList.add('hide');

      var text = _('selectContact');
      if (appTitleElement.textContent !== text) {
        appTitleElement.textContent = text;
      }
    } else if (contactsList && !contactsList.isSelecting) {
      cancelButton.classList.add('hide');
      addButton.classList.remove('hide');
      settingsButton.classList.remove('hide');

      var text = _('contacts');
      if (appTitleElement.textContent !== text) {
        appTitleElement.textContent = text;
      }
    }
  };

  var initLanguages = function initLanguages() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  };


  var contactListClickHandler = function originalHandler(id) {
    initDetails(function onDetailsReady() {
      contactsList.getContactById(id, function findCb(contact, fbContact) {
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
        var phoneNumber = params['tel'];
        data['tel'] = [{
          'value': phoneNumber,
          'carrier': null,
          'type': [TAG_OPTIONS['phone-type'][0].type]
        }];
      }
      if (params.hasOwnProperty('email')) {
        var email = params['email'];
        data['email'] = [{
          'value': email,
          'type': [TAG_OPTIONS['email-type'][0].type]
        }];
      }
      var hash = '#view-contact-form?extras=' +
        encodeURIComponent(JSON.stringify(data)) + '&id=' + id;
      if (fromUpdateActivity)
        hash += '&fromUpdateActivity=1';
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
        ActivityHandler.activityName === 'open')
      SmsIntegration.sendSms(number);
  };

  var callOrPick = function callOrPick(number) {
    LazyLoader.load('/dialer/js/mmi.js', function mmiLoaded() {
      if (ActivityHandler.currentlyHandling &&
          ActivityHandler.activityName !== 'open') {
        ActivityHandler.postPickSuccess({ number: number });
      } else if (MmiManager.isMMI(number)) {
        // For security reasons we cannot directly call MmiManager.send(). We
        // need to show the MMI number in the dialer instead.
        new MozActivity({
          name: 'dial',
          data: {
            type: 'webtelephony/number',
            number: number
          }
        });
      } else if (navigator.mozTelephony) {
        TelephonyHelper.call(number);
      }
    });
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
  };

  var isUpdated = function isUpdated(contact1, contact2) {
    return contact1.id == contact2.id &&
      (contact1.updated - contact2.updated) == 0;
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
        LazyLoader.load(['/contacts/js/utilities/image_thumbnail.js'],
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
        detailsReady = true;
        contactsDetails = contacts.Details;
        contactsDetails.init();
        callback();
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
    });
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
    });
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
      '/contacts/js/utilities/templates.js',
      '/contacts/js/contacts_shortcuts.js',
      '/contacts/js/contacts_tag.js',
      '/contacts/js/import_utils.js',
      '/contacts/js/utilities/normalizer.js',
      '/shared/js/text_normalizer.js',
      '/dialer/js/telephony_helper.js',
      '/contacts/js/sms_integration.js',
      '/contacts/js/utilities/sdcard.js',
      '/contacts/js/utilities/vcard_parser.js',
      '/contacts/js/utilities/status.js',
      '/contacts/js/utilities/dom.js'
    ];

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
              var mergedContact = enrichedContact || contact;
              contactsDetails.setContact(mergedContact);
              contactsDetails.render(mergedContact, null, enrichedContact);
              contactsList.refresh(mergedContact, checkPendingChanges,
                                   event.reason);
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
    window.removeEventListener('localized', initContacts);
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

  window.addEventListener('localized', initContacts); // addEventListener

  function loadConfirmDialog() {
    var args = Array.slice(arguments);
    Contacts.utility('Confirm', function viewLoaded() {
      ConfirmDialog.show.apply(ConfirmDialog, args);
    });
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
    utilities: {}
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

  function load(type, file, callback) {
    /**
     * Performs the actual lazy loading
     * Called once all dependencies are met
     */
    function doLoad() {
      var name = file.toLowerCase();
      var toLoad = ['js/' + type + '/' + name + '.js'];

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
  function loadView(view, callback) {
    load('views', view, callback);
  }

  /**
   * Loads a utility from the utilities/ folder
   * @param {String} utility name.
   * @param {Function} callback.
   */
  function loadUtility(utility, callback) {
    load('utilities', utility, callback);
  }

  return {
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
    get asyncScriptsLoaded() {
      return asyncScriptsLoaded;
    }
  };
})();
