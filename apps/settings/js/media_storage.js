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

var Volume = function(name, external, externalIndex, storages) {
  this.name = name;
  this.external = external;
  this.externalIndex = externalIndex;
  this.storages = storages;
  this.rootElement = null;  //<ul></ul>
  this.stackedbar = null;
};

// This function will create a view for each volume under #volume-list,
// the DOM structure looks like:
//
//<header>
//  <h2 data-l10n-id="storage-name-internal">Internal Storage</h2>
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
//    <label class="pack-switch">
//      <input type="checkbox" name="ums.volume.sdcard.enabled" />
//      <span data-l10n-id="share-using-usb">Share using USB</span>
//    </label>
//  </li>
//</ul>

Volume.prototype.getL10nId = function volume_getL10nId(useShort) {
  var prefix = useShort ? 'short-storage-name-' : 'storage-name-';
  if (this.external) {
    return prefix + 'external-' + this.externalIndex;
  } else {
    return prefix + 'internal';
  }
};

Volume.prototype.createView = function volume_createView(listRoot) {
  var _ = navigator.mozL10n.get;
  // create header
  var h2 = document.createElement('h2');
  var l10nId = this.getL10nId();
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
  input.name = 'ums.volume.' + this.name + '.enabled';
  var label = document.createElement('label');
  label.classList.add('pack-switch');
  label.appendChild(input);
  var span = document.createElement('span');
  span.dataset.l10nId = 'share-using-usb';
  span.textContent = _('share-using-usb');
  label.appendChild(span);

  var ele = document.createElement('li');
  ele.appendChild(label);
  this.rootElement.appendChild(ele);
};

Volume.prototype.updateStorageInfo = function volume_updateStorageInfo() {
  // Update the storage details
  var self = this;
  this.getStats(function(sizes) {
    self.stackedbar.reset();
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
    // Use visibilitychange so that we don't get notified of device
    // storage notifications when the settings app isn't visible.
    document.addEventListener('visibilitychange', this);
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
    this.makeDefaultLocationMenu();

    window.addEventListener('localized', this);

    this.updateInfo();
  },

  initAllVolumeObjects: function ms_initAllVolumeObjects() {
    var volumes = {};
    var totalVolumes = 0;
    MEDIA_TYPE.forEach(function(type) {
      var storages = navigator.getDeviceStorages(type);
      storages.forEach(function(storage) {
        var name = storage.storageName;
        if (!volumes.hasOwnProperty(name)) {
          volumes[name] = {};
          totalVolumes++;
        }
        volumes[name][type] = storage;
      });
    });

    var volumeList = [];
    var externalIndex = 0;
    var volumeListRootElement = document.getElementById('volume-list');
    for (var name in volumes) {
      var volume;
      // XXX: This is a heuristic to determine whether a storage is internal or
      // external (e.g. a pluggable SD card). It does *not* work in general, but
      // it works for all officially-supported devices.
      if (totalVolumes > 1 && name === 'sdcard') {
        volume = new Volume(name, false /* internal */, 0, volumes[name]);
      } else {
        volume = new Volume(name, true /* external */, externalIndex++,
                            volumes[name]);
      }
      volume.createView(volumeListRootElement);
      volumeList.push(volume);
    }
    return volumeList;
  },

  registerUmsListener: function ms_registerUmsListener() {
    var self = this;
    var settings = Settings.mozSettings;
    this._volumeList.forEach(function(volume, index) {
      var key = 'ums.volume.' + volume.name + '.enabled';
      Settings.getSettings(function(allSettings) {
        var input = document.querySelector('input[name="' + key + '"]');
        input.checked = allSettings[key] || false;
        self.usmEnabledVolume[index] = input.checked;
        self.updateMasterUmsDesc();
      });
      settings.addObserver(key, function(evt) {
        self.usmEnabledVolume[index] = evt.settingValue;
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
          list.push(_(this._volumeList[id].getL10nId(true)));
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
          this.updateInfo();
        }
        break;
      case 'click':
        this.changeDefaultStorage();
        break;
      case 'visibilitychange':
        this.updateListeners(this.updateInfo.bind(this));
        break;
    }
  },

  makeDefaultLocationMenu: function ms_makeDefaultLocationMenu() {
    var _ = navigator.mozL10n.get;
    var self = this;
    var defaultMediaVolumeKey = 'device.storage.writable.name';
    Settings.getSettings(function(allSettings) {
      var defaultName = allSettings[defaultMediaVolumeKey];
      var selectionMenu = self.defaultMediaLocation;
      var selectedIndex = 0;
      self._volumeList.forEach(function(volume, index) {
        var option = document.createElement('option');
        option.value = volume.name;
        var l10nId = volume.getL10nId(true);
        option.dataset.l10nId = l10nId;
        option.textContent = _(l10nId);
        selectionMenu.appendChild(option);
        if (defaultName && volume.name === defaultName) {
          selectedIndex = index;
        }
      });
      var selectedOption = selectionMenu.options[selectedIndex];
      selectedOption.selected = true;

      // disable option menu if we have only one option
      if (self._volumeList.length === 1) {
        selectionMenu.disabled = true;
        var obj = {};
        obj[defaultMediaVolumeKey] = selectedOption.value;
        Settings.mozSettings.createLock().set(obj);
      }
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
    if (document.hidden) {
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

  updateInfo: function ms_updateInfo() {
    var self = this;
    this.umsVolumeShareState = false;
    this._volumeList.forEach(function(volume) {
      volume.updateInfo(function(state) {
        if (state === 'shared') {
          self.umsVolumeShareState = true;
        }
        self.updateMasterUmsDesc();
      });
    });
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
        if (!ele) {
          ele = document.createElement('span');
          ele.classList.add(className);
          ele.classList.add('stackedbar-item');
          container.appendChild(ele);
        }
        ele.style.width = (item.value * 100) / totalSize + '%';
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
