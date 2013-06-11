/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The whole purpose of this code is to detect when we're in the state of having
 * the UMS Enabled checkbox unchecked, but the SD-card is still being shared
 * with the PC.
 *
 * In this case, the user has to unplug the USB cable in order to actually turn
 * off UMS, and we put some text to that effect on the settings screen.
 */
const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];
const ITEM_TYPE = ['music', 'pictures', 'videos', 'free'];

var Volume = function(index, name, storages) {
  this.index = index;
  this.name = name;
  this.storages = storages;
  this.rootElement = null;  //<ul></ul>
  this.stackedbar = null;
  this.state = null;
};

// This function will create a view for each volume under #volume-list,
// the DOM structure looks like:
//
//<header>
//  <h2 data-l10n-id="storage-name-sdcard">Internal Storage</h2>
//</header>
//<ul>
//  <li>
//    <div id="sdcard-space-stackedbar" class="space-stackedbar">
//      <!-- stacked bar for displaying the amounts of media type usages -->
//    </div>
//  </li>
//  <li class="color-music">
//    <span class="stackedbar-color-label"></span>
//    <a data-l10n-id="music-space">Music
//      <span class="size"></span>
//    </a>
//  </li>
//  <li class="color-pictures">
//    <span class="stackedbar-color-label"></span>
//    <a data-l10n-id="pictures-space">Pictures
//      <span class="size"></span>
//    </a>
//  </li>
//  <li class="color-videos">
//    <span class="stackedbar-color-label"></span>
//    <a data-l10n-id="videos-space">Videos
//      <span class="size"></span>
//    </a>
//  </li>
//  <li class="color-free">
//    <span class="stackedbar-color-label"></span>
//    <a data-l10n-id="free-space">Space left
//      <span class="size"></span>
//    </a>
//  </li>
//  <li>
//    <label>
//      <input type="checkbox" data-type="switch"
//        name="ums.volume.sdcard.enabled" />
//      <span></span>
//    </label>
//    <a data-l10n-id="share-using-usb">Share using USB</a>
//  </li>
//</ul>

Volume.prototype.createView = function volume_createView(listRoot) {
  var _ = navigator.mozL10n.get;
  // create header
  var h2 = document.createElement('h2');
  var l10nId = 'storage-name-' + this.index;
  h2.dataset.l10nId = l10nId;
  h2.textContent = _(l10nId);
  var header = document.createElement('header');
  header.appendChild(h2);
  listRoot.appendChild(header);
  // create ul
  this.rootElement = document.createElement('ul');
  listRoot.appendChild(this.rootElement);

  var stackedbarDiv = document.createElement('div');
  stackedbarDiv.id = this.name + '-space-stackedbar';
  stackedbarDiv.classList.add('space-stackedbar');
  var li = document.createElement('li');
  li.appendChild(stackedbarDiv);
  this.rootElement.appendChild(li);
  this.stackedbar = StackedBar(stackedbarDiv);

  var self = this;
  ITEM_TYPE.forEach(function(type) {
    var label = document.createElement('span');
    label.classList.add('stackedbar-color-label');
    var size = document.createElement('span');
    size.classList.add('size');
    var text = document.createElement('a');
    var l10nId = type + '-space';
    text.dataset.l10nId = l10nId;
    text.textContent = _(l10nId);
    text.appendChild(size);
    var li = document.createElement('li');
    li.classList.add('color-' + type);
    li.appendChild(label);
    li.appendChild(text);
    self.rootElement.appendChild(li);
  });

  var input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.type = 'switch';
  input.name = 'ums.volume.' + this.name + '.enabled';
  var span = document.createElement('span');
  var label = document.createElement('label');
  label.appendChild(input);
  label.appendChild(span);
  var text = document.createElement('a');
  text.dataset.l10nId = 'share-using-usb';
  text.textContent = _('share-using-usb');

  var ele = document.createElement('li');
  ele.appendChild(label);
  ele.appendChild(text);
  this.rootElement.appendChild(ele);
};

Volume.prototype.updateStorageInfo = function volume_updateStorageInfo() {
  // Update the storage details
  var self = this;
  this.stackedbar.reset();
  this.getStats(function(sizes) {
    ITEM_TYPE.forEach(function(type) {
      var element = self.rootElement.querySelector('.color-' + type + ' .size');
      DeviceStorageHelper.showFormatedSize(element, 'storageSize', sizes[type]);
      self.stackedbar.add({ 'type': type, 'value': sizes[type] });
    });
    self.stackedbar.refreshUI();
  });
};

Volume.prototype.getStats = function volume_getStats(callback) {
  var results = {};
  var current = MEDIA_TYPE.length;
  var storages = this.storages;
  MEDIA_TYPE.forEach(function(type) {
    var storage = storages[type];
    storage.usedSpace().onsuccess = function(e) {
      results[type] = e.target.result;
      current--;
      if (current == 0) {
        storage.freeSpace().onsuccess = function(e) {
          results['free'] = e.target.result;
          if (callback)
            callback(results);
        };
      }
    };
  });
};

Volume.prototype.updateInfo = function volume_updateInfo(callback) {
  var self = this;
  var availreq = this.storages.sdcard.available();
  availreq.onsuccess = function availSuccess(evt) {
    var state = evt.target.result;
    self.state = state;
    switch (state) {
      case 'shared':
        self.setInfoUnavailable();
        break;
      case 'unavailable':
        self.setInfoUnavailable();
        break;
      case 'available':
        self.updateStorageInfo();
        break;
    }
    if (callback)
      callback(state);
  };
};

Volume.prototype.setInfoUnavailable = function volume_setInfoUnavailable() {
  var self = this;
  var _ = navigator.mozL10n.get;
  ITEM_TYPE.forEach(function(type) {
    var rule = '.color-' + type + ' .size';
    var element = self.rootElement.querySelector(rule);
    element.textContent = _('size-not-available');
    element.dataset.l10nId = 'size-not-available';
  });
  this.stackedbar.reset();
};

var MediaStorage = {
  init: function ms_init() {
    this._volumeList = this.initAllVolumeObjects();

    this.documentStorageListener = false;
    this.updateListeners();

    this.usmEnabledVolume = {};
    this.umsVolumeShareState = false;
    // Use mozvisibilitychange so that we don't get notified of device
    // storage notifications when the settings app isn't visible.
    document.addEventListener('mozvisibilitychange', this);
    this.umsEnabledCheckBox = document.getElementById('ums-switch');
    this.umsEnabledInfoBlock = document.getElementById('ums-desc');
    this.umsEnabledCheckBox.addEventListener('change', this);
    this.registerUmsListener();

    var self = this;
    var umsSettingKey = 'ums.enabled';
    Settings.getSettings(function(allSettings) {
      self.umsEnabledCheckBox.checked = allSettings[umsSettingKey] || false;
      self.updateMasterUmsDesc();
    });
    Settings.mozSettings.addObserver(umsSettingKey, function(evt) {
      self.umsEnabledCheckBox.checked = evt.settingValue;
      self.updateMasterUmsDesc();
    });

    this.defaultMediaLocation = document.getElementById('defaultMediaLocation');
    this.defaultMediaLocation.addEventListener('click', this);

    window.addEventListener('localized', this);

    this.updateInfo(this.makeDefaultLocationMenu.bind(this));
  },

  initAllVolumeObjects: function ms_initAllVolumeObjects() {
    var volumes = {};
    MEDIA_TYPE.forEach(function(type) {
      var storages = navigator.getDeviceStorages(type);
      storages.forEach(function(storage) {
        var name = storage.storageName;
        if (!volumes.hasOwnProperty(name)) {
          volumes[name] = {};
        }
        volumes[name][type] = storage;
      });
    });
    var _ = navigator.mozL10n.get;
    var volumeList = [];
    var volumeListRootElement = document.getElementById('volume-list');
    for (var name in volumes) {
      var volume = new Volume(volumeList.length, name, volumes[name]);
      volume.createView(volumeListRootElement);
      volumeList.push(volume);
    }
    return volumeList;
  },

  registerUmsListener: function ms_registerUmsListener() {
    var self = this;
    var settings = Settings.mozSettings;
    this._volumeList.forEach(function(volume) {
      var key = 'ums.volume.' + volume.name + '.enabled';
      Settings.getSettings(function(allSettings) {
        var input = document.querySelector('input[name="' + key + '"]');
        input.checked = allSettings[key] || false;
        self.usmEnabledVolume[volume.index] = input.checked;
        self.updateMasterUmsDesc();
      });
      settings.addObserver(key, function(evt) {
        self.usmEnabledVolume[volume.index] = evt.settingValue;
        self.updateMasterUmsDesc();
      });
    });
  },

  updateMasterUmsDesc: function ms_updateMasterUmsDesc() {
    var _ = navigator.mozL10n.get;
    if (this.umsEnabledCheckBox.checked) {
      var list = [];
      for (var id in this.usmEnabledVolume) {
        if (this.usmEnabledVolume[id]) {
          list.push(_('short-storage-name-' + id));
        }
      }
      if (list.length === 0) {
        this.umsEnabledInfoBlock.textContent = _('enabled');
        this.umsEnabledInfoBlock.dataset.l10nId = 'enabled';
      } else {
        var desc = _('ums-shared-volumes', { list: list.join(', ') });
        this.umsEnabledInfoBlock.textContent = desc;
        this.umsEnabledInfoBlock.dataset.l10nId = '';
      }
    } else if (this.umsVolumeShareState) {
      this.umsEnabledInfoBlock.textContent = _('umsUnplugToDisable');
      this.umsEnabledInfoBlock.dataset.l10nId = 'umsUnplugToDisable';
    } else {
      this.umsEnabledInfoBlock.textContent = _('disabled');
      this.umsEnabledInfoBlock.dataset.l10nId = 'disabled';
    }
  },

  handleEvent: function ms_handleEvent(evt) {
    switch (evt.type) {
      case 'localized':
        this.updateInfo();
        break;
      case 'change':
        if (evt.target.id === 'ums-switch') {
          Storage.umsMasterSettingChanged(evt);
        } else {
          // we are handling storage state changes
          // possible state: available, unavailable, shared
          this.updateInfo(this.refreshDefaultLocationMenu.bind(this));
        }
        break;
      case 'click':
        this.changeDefaultStorage();
        break;
      case 'mozvisibilitychange':
        this.updateListeners(this.updateInfo.bind(this));
        break;
    }
  },

  makeDefaultLocationMenu: function ms_makeDefaultLocationMenu() {
    var _ = navigator.mozL10n.get;

    var selectionMenu = this.defaultMediaLocation;
    this._volumeList.forEach(function(volume, index) {
      var option = document.createElement('option');
      option.value = volume.name;
      var l10nId = 'short-storage-name-' + volume.index;
      option.dataset.l10nId = l10nId;
      option.textContent = _(l10nId);
      selectionMenu.appendChild(option);
    });

    // disable option menu if we have only one option
    if (this._volumeList.length === 1) {
      selectionMenu.disabled = true;
      var obj = {};
      obj[defaultMediaVolumeKey] = selectedOption.value;
      Settings.mozSettings.createLock().set(obj);
    }

    this.refreshDefaultLocationMenu();
  },

  refreshDefaultLocationMenu: function ms_refreshDLMenu() {
    var self = this;
    var defaultMediaLocation = this.defaultMediaLocation;

    Settings.getSettings(function(allSettings) {
      var currentDefaultVolumeName =
        allSettings['device.storage.writable.name'];
      var defaultMediaVolumeAvailable = true;

      self._volumeList.forEach(function(volume) {
        var available = (volume.state === 'available');
        // check if the current default volume is available
        if (volume.name === currentDefaultVolumeName) {
          defaultMediaVolumeAvailable = available;
        }

        // disable options of unavailable storages
        var option = defaultMediaLocation.querySelector(
          'option[value=' + volume.name + ']');
        if (option) {
          option.disabled = !available;
        }
      });

      /* change the default media volume to 'sdcard'
       * if the original volume is unavailable.
       */
      if (!defaultMediaVolumeAvailable) {
        if (currentDefaultVolumeName !== 'sdcard') {
          currentDefaultVolumeName = 'sdcard';
        }
      }

      // change the default selection
      var option = defaultMediaLocation.querySelector(
        'option[value=' + currentDefaultVolumeName + ']');
      if (option)
        option.selected = true;

      // dispatch a change event to trigger the fake select change
      var evt = document.createEvent('Event');
      evt.initEvent('change', true, true);
      defaultMediaLocation.dispatchEvent(evt);
    });
  },

  changeDefaultStorage: function ms_changeDefaultStorage() {
    //Pop up a confirm window before listing options.
    var popup = document.getElementById('default-location-popup-container');
    var cancelBtn = document.getElementById('default-location-cancel-btn');
    var changeBtn = document.getElementById('default-location-change-btn');

    this.defaultMediaLocation.blur();
    var self = this;
    popup.hidden = false;
    cancelBtn.onclick = function() {
      popup.hidden = true;
    };
    changeBtn.onclick = function() {
      popup.hidden = true;
      setTimeout(function() {
        self.defaultMediaLocation.focus();
      });
    };
  },

  updateListeners: function ms_updateListeners(callback) {
    var self = this;
    if (document.mozHidden) {
      // Settings is being hidden. Unregister our change listener so we won't
      // get notifications whenever files are added in another app.
      if (this.documentStorageListener) {
        this._volumeList.forEach(function(volume) {
          // use sdcard storage to represent this volume
          var volumeStorage = volume.storages.sdcard;
          volumeStorage.removeEventListener('change', self);
        });
        this.documentStorageListener = false;
      }
    } else {
      if (!this.documentStorageListener) {
        this._volumeList.forEach(function(volume) {
          // use sdcard storage to represent this volume
          var volumeStorage = volume.storages.sdcard;
          volumeStorage.addEventListener('change', self);
        });
        this.documentStorageListener = true;
      }
      if (callback && Settings.currentPanel === '#mediaStorage')
        callback();
    }
  },

  updateInfo: function ms_updateInfo(callback) {
    var self = this;

    var afterInfoUpdated = function() {
      self.umsVolumeShareState = false;

      self._volumeList.forEach(function(volume) {
        if (volume.state === 'shared') {
          self.umsVolumeShareState = true;
        }
      });
      self.updateMasterUmsDesc();

      if (callback)
        callback();
    };

    // update all volume info
    var volumeLength = this._volumeList.length;
    var finishedCount = 0;
    if (volumeLength > 0) {
      var finishedCount = 0;
      this._volumeList.forEach(function(volume) {
        volume.updateInfo(function(state) {
          finishedCount++;
          if (finishedCount === volumeLength) {
            afterInfoUpdated();
          }
        });
      });
    } else {
      afterInfoUpdated();
    }
  }
};

var StackedBar = function(div) {
  var container = div;
  var items = [];
  var totalSize = 0;

  return {
    add: function sb_add(item) {
      totalSize += item.value;
      items.push(item);
    },

    refreshUI: function sb_refreshUI() {
      container.parentNode.hidden = false;
      items.forEach(function(item) {
        var className = 'color-' + item.type;
        var ele = container.querySelector('.' + className);
        if (!ele)
          ele = document.createElement('span');
        ele.classList.add(className);
        ele.classList.add('stackedbar-item');
        ele.style.width = (item.value * 100) / totalSize + '%';
        container.appendChild(ele);
      });
    },

    reset: function sb_reset() {
      items = [];
      totalSize = 0;
      container.parentNode.hidden = true;
    }
  };
};

navigator.mozL10n.ready(MediaStorage.init.bind(MediaStorage));
