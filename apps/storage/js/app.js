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

    this.reloadStorageList();

    this.addStorageButton.addEventListener('mouseup',
      this.handleAddStorageButtonClick.bind(this));
    this.selectableFormHeader.addEventListener('action',
      this.handleSelectableFormHeaderAction.bind(this));
    this.newStorageCreateButton.addEventListener('mouseup',
      this.handleNewStorageCreateButtonClick.bind(this));
    this.newStorageForm.addEventListener('submit',
      this.handleNewStorageFormSubmit.bind(this));
    this.storageContainer.addEventListener('change',
      this.handleStorageContainerSwitchChange.bind(this));

    this.initOAuthWindow();
  },

  reloadStorageList() {
    return new Promise(resolve => {
      asyncStorage.length(resolve);
    }).then(length => {
      if (length === 0) {
        this.noStorages.classList.remove('hide');
        return;
      } else {
        this.noStorages.classList.add('hide');
      }

      var promises = [];
      for (var i = 0; i < length; i++) {
        promises.push(new Promise(resolve => {
          asyncStorage.key(i, c => {
            asyncStorage.getItem(c, resolve);
          });
        }));
      }

      Promise.all(promises).then(list => {
        var container = this.storageContainer;
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        list.forEach(item => {
          /*
            <li role="checkbox">
              <gaia-switch>
                <label>Storage Name</label>
              </gaia-switch>
            </li>
          */
          var li = document.createElement('li');
          li.setAttribute('role', 'checkbox');
          var gaia_switch = document.createElement('gaia-switch');
          gaia_switch.setAttribute('data-storage-id', item.id);
          var label = document.createElement('label');
          label.textContent = item.name;
          gaia_switch.appendChild(label);
          li.appendChild(gaia_switch);
          container.appendChild(li);
        });
      });
    });
  },

  handleAddStorageButtonClick() {
    this.showNewStorageForm();
  },

  handleStorageContainerSwitchChange(e) {
    var storageId = e.target.getAttribute('data-storage-id');
    console.log(storageId);
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
      this.updateNewAccessToken(accessToken);
      this.oauthWindow.removeChild(this.browserFrame);
      this.viewStoragesList.classList.remove('hide');
    } else {
      alert('Unknown error while getting Access Token!');
    }
  },

  updateNewAccessToken(accessToken) {
    var newStorage = {
      name: this.newStorageName.value,
      type: this.newStorageType.value,
      token: accessToken
    };
    newStorage.id = newStorage.type + '::' + newStorage.name;
    asyncStorage.setItem(newStorage.id, newStorage, () => {
      console.log(newStorage);
      this.newStorageName.value = '';
      this.newStorageType.value = '';
      this.reloadStorageList();
    });
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
