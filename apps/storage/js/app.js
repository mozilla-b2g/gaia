'use strict';
/* global asyncStorage */
/* global FileSystemHelper */
/* global udManagerHelper */
/* global DropboxAuth */
/* exported Storage */

var Storage = {
  editMode: false,

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
      'edit-storage-button',

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
    this.editStorageButton.addEventListener('mouseup',
      this.handleEditStorageButtonClick.bind(this));
    this.selectableFormHeader.addEventListener('action',
      this.handleSelectableFormHeaderAction.bind(this));
    this.newStorageCreateButton.addEventListener('mouseup',
      this.handleNewStorageCreateButtonClick.bind(this));
    this.newStorageForm.addEventListener('submit',
      this.handleNewStorageFormSubmit.bind(this));
    this.storageContainer.addEventListener('change',
      this.handleStorageContainerSwitchChange.bind(this));

    FileSystemHelper.init();
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

      return Promise.all(promises).then(list => {
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

          var deleteButton = document.createElement('span');
          deleteButton.textContent = 'Delete';
          deleteButton.classList.add('edit-delete-btn');
          deleteButton.classList.add('hide');

          var name = document.createElement('span');
          name.textContent = item.name;

          var label = document.createElement('label');
          label.appendChild(deleteButton);
          label.appendChild(name);

          var gaia_switch = document.createElement('gaia-switch');
          gaia_switch.setAttribute('data-storage-id', item.id);
          gaia_switch.appendChild(label);

          var li = document.createElement('li');
          li.setAttribute('role', 'checkbox');
          li.appendChild(gaia_switch);
          container.appendChild(li);
          gaia_switch.checked = this.storageEnabled(item.id);
        });
      });
    });
  },

  handleAddStorageButtonClick() {
    this.showNewStorageForm();
  },

  handleEditStorageButtonClick() {
    console.log('edit', this.editMode);
    if (this.editMode) {
      this.editMode = false;
    } else {
      this.editMode = true;
    }
    this.switchEditMode();
  },

  storageEnabled(fsId) {
    return navigator.getDeviceStorages('sdcard').some(el => {
      return el.storageName === fsId;
    });
  },

  switchEditMode() {
    var container = this.storageContainer;
    var children = container.childNodes;
    for (var i = 0; i < children.length; i++) {
      var deleteBtn = children[i].
        querySelector('gaia-switch span.edit-delete-btn');
      if (this.editMode) {
        deleteBtn.classList.remove('hide');
      } else {
        deleteBtn.classList.add('hide');
      }
    }
  },

  handleStorageContainerSwitchChange(e) {
    var storageId = e.target.getAttribute('data-storage-id');
    console.log(storageId);
    asyncStorage.getItem(storageId, storage => {
      if (storage.type === 'dropbox') {
        if (this.storageEnabled(storage.id)) {
          FileSystemHelper.unmount();
        } else {
          udManagerHelper.init('Dropbox', {token: storage.token});
          FileSystemHelper.mount({
            id: storage.id, name: storage.name
          }).then(e => console.log(e));
        }
      }
    });
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

  showOAuthWindow() {
    if (this.newStorageType.value === 'dropbox') {
      DropboxAuth.init();
      this.viewStoragesList.classList.add('hide');
      this.newStorageForm.classList.add('hide');
      DropboxAuth.show(this.oauthWindow).then(token => {
        this.viewStoragesList.classList.remove('hide');
        this.updateNewAccessToken(token);
      }, error => {
        console.error(error);
        this.viewStoragesList.classList.remove('hide');
      });
    }
  },

  updateNewAccessToken(accessToken) {
    var newStorage = {
      name: this.newStorageName.value,
      type: this.newStorageType.value,
      token: accessToken
    };
    newStorage.id = newStorage.type + '_' + newStorage.name;
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
