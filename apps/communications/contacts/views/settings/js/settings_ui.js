/* global SettingsController */
/* global navigationStack */
/* global ICE */
/* global LazyLoader */
/* global Cache */
/* global utils */
/* global SimDomGenerator */
/* global IccHandler */

/***
 This class handles all the activity regarding
 the settings screen for contacts
 **/
(function(exports) {
  'use strict';

  var navigationHandler,
      importSettingsPanel,
      importSettingsHeader,
      importSettingsTitle,
      importLiveOption,
      importGmailOption,
      importSDOption,
      importContacts,
      exportContacts,
      exportSDOption,
      doneButton,
      setICEButton,
      bulkDeleteButton,
      orderItem,
      orderCheckBox,
      orderByLastName,
      newOrderByLastName = null;

  // Cache DOM elements for quicker access
  function cacheElements() {
    doneButton = document.getElementById('settings-close');
    importContacts = document.getElementById('importContacts');
    exportContacts = document.getElementById('exportContacts');
    setICEButton = document.getElementById('set-ice');
    bulkDeleteButton = document.getElementById('bulkDelete');
    document.querySelector('#settings-article').dataset.state = 'fb-disabled';
    orderItem = document.getElementById('settingsOrder');
    orderCheckBox = orderItem.querySelector('[name="order.lastname"]');

    // Creating a navigation handler from this view
    navigationHandler = new navigationStack('view-settings');

    // Init panel & elements for caching them
    importSettingsHeader = document.getElementById('import-settings-header');
    importSettingsPanel = document.getElementById('import-settings');
    importSettingsTitle = document.getElementById('import-settings-title');
    importSDOption = document.getElementById('import-sd-option');
    exportSDOption = document.getElementById('export-sd-option');
    importLiveOption = document.getElementById('import-live-option');
    importGmailOption = document.getElementById('import-gmail-option');
  }

  // Close
  function closeHandler() {
    dispatchEvent('close-ui');
  }

  // Change contacts ordering
  function onOrderingChange(evt) {
    newOrderByLastName = orderCheckBox.checked;
    if(newOrderByLastName !== orderByLastName){
      sessionStorage.setItem('orderchange', true);
    } else {
      sessionStorage.setItem('orderchange', null);
    }
    utils.cookie.update({order: newOrderByLastName});
    updateOrderingUI();
    //TODO Cache shouldn't be dealt with in here
    Cache.evict();
  }

  function updateImportTitle(l10nString) {
    importSettingsTitle.setAttribute('data-l10n-id', l10nString);
  }

  //Import
  function importHandler() {
    LazyLoader.load(['/contacts/js/utilities/telemetry.js'], () => {
      // Hide elements for export and transition
      importSettingsPanel.classList.remove('export');
      importSettingsPanel.classList.add('import');
      updateImportTitle('importContactsTitle');
      navigationHandler.go('import-settings', 'right-left');
    });
  }

  //Export
  function exportHandler() {
    // Hide elements for import and transition
    importSettingsPanel.classList.remove('import');
    importSettingsPanel.classList.add('export');
    updateImportTitle('exportContactsTitle');
    navigationHandler.go('import-settings', 'right-left');
  }

  //ICE
  function iceHandler() {
    showICEScreen();
  }

  function showICEScreen(cb) {
    LazyLoader.load([
      '/contacts/js/utilities/ice_data.js',
      '/contacts/js/views/ice_settings.js',
      '/shared/js/contacts/utilities/ice_store.js'], function(){
      ICE.refresh();
      navigationHandler.go('ice-settings', 'right-left');
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

  //Delete
  function deleteHandler() {
    dispatchEvent('delete-ui');
  }

  function importSettingsBackHandler() {
    navigationHandler.back(function navigateBackHandler() {
      // Removing the previous assigned style for having
      // a clean view
      importSettingsPanel.classList.remove('export');
      importSettingsPanel.classList.remove('import');
    });
  }

  function dispatchEvent(name, data) {
    window.dispatchEvent(new CustomEvent(name, {detail: data}));
  }

  // Listeners
  function addListeners() {
    // click on any import service
    document.getElementById('import-options').addEventListener('click', (e) => {
      dispatchEvent('importClicked', e);
    });

    // click on any export service
    document.getElementById('export-options').addEventListener('click', (e) => {
      dispatchEvent('exportClicked', e);
    });

    orderCheckBox.addEventListener('change', onOrderingChange);
    doneButton.addEventListener('click', closeHandler);
    importContacts.addEventListener('click', importHandler);
    exportContacts.addEventListener('click', exportHandler);
    setICEButton.addEventListener('click', iceHandler);

    // TODO MAIN ISSUE HERE! We need to communicate with LIST
    // and show the list with EDIT mode.
    bulkDeleteButton.addEventListener('click', deleteHandler);

    importSettingsHeader.addEventListener('action', importSettingsBackHandler);

    // Subscribe to events related to change state in the sd card
    utils.sdcard.subscribeToChanges('check_sdcard', function(value) {
      updateStorageOptions(utils.sdcard.checkStorageCard());
    });

    window.addEventListener('timeformatchange', updateTimestamps);
    window.addEventListener('contactsimportdone', onImportDone);

    // Listener for updating the timestamp based on extServices
    window.addEventListener('message', function updateList(evt) {
      if (evt.data.type === 'import_updated') {
        updateTimestamps();
        checkNoContacts();
      }
    });
  }

  // Disables/Enables an option and show the error if needed
  function updateOptionStatus(domOption, disabled, error) {
    if (domOption === null) {
      return;
    }
    var optionButton = domOption.firstElementChild;
    if (disabled) {
      optionButton.setAttribute('disabled', 'disabled');
      if (error) {
        domOption.classList.add('error');
      } else {
        domOption.classList.remove('error');
      }
    } else {
      optionButton.removeAttribute('disabled');
      domOption.classList.remove('error');
    }
  }

  // Disables/Enables the actions over the sim import functionality
  function enableSIMOptions(iccId, cardState) {
    var importSimOption = document.getElementById('import-sim-option-' + iccId);
    var exportSimOption = document.getElementById('export-sim-option-' + iccId);
    var disabled = (cardState !== 'ready' && cardState !== 'illegal');
    updateOptionStatus(importSimOption, disabled, true);
    updateOptionStatus(exportSimOption, disabled, true);
  }

  // Options checking & updating
  function checkSIMCard() {
    var statuses = IccHandler.getStatus();
    statuses.forEach(function onStatus(status) {
      enableSIMOptions(status.iccId, status.cardState);
    });
  }


  // Initialise the settings screen (components, listeners ...)
  function init() {
    // Create the DOM for our SIM cards and listen to any changes
    IccHandler.init(new SimDomGenerator(), checkSIMCard);

    cacheElements();
    addListeners();
    getData();
    checkNoContacts();
    updateTimestamps();

    // To avoid any race condition we listen for online events once
    // containers have been initialized
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
  }

  // Disables/Enables an option and show the error if needed
  function updateOptionStatus(domOption, disabled, error) {
    if (domOption === null) {
      return;
    }
    var optionButton = domOption.firstElementChild;
    if (disabled) {
      optionButton.setAttribute('disabled', 'disabled');
      if (error) {
        domOption.classList.add('error');
      } else {
        domOption.classList.remove('error');
      }
    } else {
      optionButton.removeAttribute('disabled');
      domOption.classList.remove('error');
    }
  }

  /**
   * Disables/Enables the actions over the sdcard import/export functionality
   * @param {Boolean} cardAvailable Whether functions should be enabled or not.
   */
  function updateStorageOptions(cardAvailable) {
    // Enable/Disable button and shows/hides error message
    updateOptionStatus(importSDOption, !cardAvailable, true);
    updateOptionStatus(exportSDOption, !cardAvailable, true);

    var importSDErrorL10nId = null;
    var exportSDErrorL10nId = null;

    var cardShared = utils.sdcard.status === utils.sdcard.SHARED;
    if (!cardAvailable) {
      importSDErrorL10nId = 'noMemoryCardMsg';
      exportSDErrorL10nId = 'noMemoryCardMsgExport';

      if (cardShared) {
        importSDErrorL10nId = exportSDErrorL10nId = 'memoryCardUMSEnabled';
      }
    }

    // update the message
    var importSDErrorNode = importSDOption.querySelector('p.error-message');
    if (importSDErrorL10nId) {
      importSDErrorNode.setAttribute('data-l10n-id', importSDErrorL10nId);
    } else {
      importSDErrorNode.removeAttribute('data-l10n-id');
      importSDErrorNode.textContent = '';
    }

    var exportSDErrorNode = exportSDOption.querySelector('p');
    if (exportSDErrorL10nId) {
      exportSDErrorNode.setAttribute('data-l10n-id', exportSDErrorL10nId);
    } else {
      exportSDErrorNode.removeAttribute('data-l10n-id');
      exportSDErrorNode.textContent = '';
    }
  }

  function updateOrderingUI() {
    var value =
      newOrderByLastName === null ? orderByLastName : newOrderByLastName;
    orderCheckBox.checked = value;
    orderCheckBox.setAttribute('aria-checked', value);
  }

  // Get the different values that we will show in the app
  function getData() {
    var config = utils.cookie.load();
    var order = config ? config.order : false;
    orderByLastName = order;
    newOrderByLastName = null;
    updateOrderingUI();
  }

  function onImportDone(evt) {
    updateTimestamps();
    checkNoContacts();
  }

  function checkOnline() {
    // Perform pending automatic logouts
    window.setTimeout(SettingsController.automaticLogout, 0);

    // Other import services settings
    updateOptionStatus(importGmailOption, !navigator.onLine, true);
    updateOptionStatus(importLiveOption, !navigator.onLine, true);
  }

  function checkNoContacts() {
    var exportButton = exportContacts.firstElementChild;

    SettingsController.checkNoContacts().then(isEmpty => {
      if (isEmpty) {
        exportButton.setAttribute('disabled', 'disabled');
        bulkDeleteButton.setAttribute('disabled', 'disabled');
        setICEButton.setAttribute('disabled', 'disabled');
      } else {
        exportButton.removeAttribute('disabled');
        bulkDeleteButton.removeAttribute('disabled');
        setICEButton.removeAttribute('disabled');
      }
    }).catch(error => {
      window.console.warn(
        'Error while trying to know the contact number',
        error
      );
      // In case of error is safer to leave enabled
      exportButton.removeAttribute('disabled');
      bulkDeleteButton.removeAttribute('disabled');
    });
  }

  function updateTimestamps() {
    // TODO Add the same functionality to 'EXPORT' methods when ready.
    var importSources =
      document.querySelectorAll('#import-options li[data-source]');
    Array.prototype.forEach.call(importSources, function(node) {
      utils.misc.getTimestamp(node.dataset.source,
                                      function(time) {
        var spanID = 'notImported';
        if (time) {
          spanID = 'imported';
          var timeElement = node.querySelector('p > time');
          timeElement.setAttribute('datetime',
                                             (new Date(time)).toLocaleString());
          timeElement.textContent = utils.time.pretty(time);
        }
        node.querySelector('p > span').setAttribute('data-l10n-id', spanID);
      });
    });
  }

  exports.SettingsUI = {
    'init': init,
    'updateTimestamps': updateTimestamps,
    'showICEScreen' : showICEScreen,
    'updateOrderingUI': updateOrderingUI,
    get navigation() { return navigationHandler; }
  };
})(window);
