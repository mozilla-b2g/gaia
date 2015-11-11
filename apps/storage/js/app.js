'use strict';
/* global asyncStorage */
/* exported Storage */

var Storage = {
  /** Get all DOM elements when inited. */
  getAllElements() {

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'view-storages-list',
      'add-storage-button',
      'edit-button',

      'no-storages',
      'storage-container',

      'new-storage-form',
      'selectable-form-header',
      'new-storage-name',
      'new-storage-type',
      'new-storage-create-button',

      'oauth-window'
    ];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  /**
   * Intialise storage panel.
   */
  init() {
    this.getAllElements();
    if (asyncStorage.length > 0) {
      this.loadStorageList();
    } else {
      this.noStorages.classList.remove('hide');
    }

    this.addStorageButton.addEventListener('mouseup',
      this.handleAddStorageButtonClick.bind(this));
    this.selectableFormHeader.addEventListener('action',
      this.handleSelectableFormHeaderAction.bind(this));
    this.newStorageCreateButton.addEventListener('mouseup',
      this.handleNewStorageCreateButtonClick.bind(this));
    this.newStorageForm.addEventListener('submit',
      this.handleNewStorageFormSubmit.bind(this));

    this.initOAuthWindow();
  },

  loadStorageList() {
    console.log(asyncStorage.key);
  },

  handleAddStorageButtonClick() {
    this.showNewStorageForm();
  },

  handleNewStorageCreateButtonClick() {
    if (this.newStorageName.value && this.newStorageType.value) {
      this.showOAuthWindow();
    } else {
      alert('Incorrect storage information.');
    }
  },

  handleNewStorageFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  initOAuthWindow() {
    const DROPBOX_APP_KEY = 'EXAMPLE_APP_KEY';

    var url = 'https://www.dropbox.com/1/oauth2/authorize?' +
              'response_type=token&' +
              'client_id=' + DROPBOX_APP_KEY + '&' +
              'force_reapprove=true&' +
              'redirect_uri=http://localhost';
    this.browserFrame = document.createElement('iframe');
    this.browserFrame.classList.add('sup-oauth2-browser');
    this.browserFrame.setAttribute('mozbrowser', true);
    this.browserFrame.setAttribute('src', url);
    this.browserFrame.addEventListener('mozbrowserlocationchange',
      this.onLocationChange.bind(this));
  },

  showOAuthWindow() {
    this.oauthWindow.appendChild(this.browserFrame);
    this.viewStoragesList.classList.add('hide');
    this.newStorageForm.classList.add('hide');
  },

  onLocationChange(event) {
    var redirectUrl = event.detail;
    var accessToken;
    var hasAccessToken = false;
    var errorMsg;
    var hasError = false;

    var parametersStr = redirectUrl.substring(redirectUrl.indexOf('#') + 1);
    var parameters = parametersStr.split('&');
    for (var i = 0; i < parameters.length; i++) {
      var parameter = parameters[i];
      var kv = parameter.split('=');
      if (kv[0] === 'access_token') {
        accessToken = kv[1];
        hasAccessToken = true;
      } else if (kv[0] === 'error_description') {
        errorMsg = kv[1];
        hasError = true;
        break;
      }
    }

    if (hasError) {
      this.oauthWindow.removeChild(this.browserFrame);
      this.viewStoragesList.classList.remove('hide');
      alert(errorMsg.replace(/\+/gi, ' '));
      return;
    }

    if (!hasAccessToken) {
      console.log('still in oauth handshake...');
      return;
    }

    if (accessToken) {
      console.log(accessToken);
      this.oauthWindow.removeChild(this.browserFrame);
      this.viewStoragesList.classList.remove('hide');
    } else {
      alert('Unknown error while getting Access Token!');
    }
  },

  handleSelectableFormHeaderAction() {
    this.viewStoragesList.classList.remove('hide');
    this.newStorageForm.classList.add('hide');
  },

  showNewStorageForm() {
    this.viewStoragesList.classList.add('hide');
    this.newStorageForm.classList.remove('hide');
  }
};

Storage.init();
