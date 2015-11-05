/* global Storage, DeviceStorageHelper */
'use strict';

/**
 * The whole purpose of this code is to detect when we're in the state of having
 * the UMS Enabled checkbox unchecked, but the SD-card is still being shared
 * with the PC.
 *
 * In this case, the user has to unplug the USB cable in order to actually turn
 * off UMS, and we put some text to that effect on the settings screen.
 */
require([
  'modules/settings_cache',
  'shared/toaster',
  'shared/settings_listener'
], function(SettingsCache, Toaster, SettingsListener) {
  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];
  const ITEM_TYPE = ['music', 'pictures', 'videos', 'free'];
  const DEFAULT_MEDIA_VOLUME_KEY = 'device.storage.writable.name';
  const EXTERNAL_UNRECOGNISED_KEY = 'volume.external.unrecognised';
  const LATENCY_CHECK_STATUS_AFTER_IDLE_IN_MILLISECONDS = 600;

  var Volume = function(name, external, externalIndex, storages) {
    this.name = name;
    this.external = external;
    this.isUnrecognised = false;
    this.externalIndex = externalIndex;
    this.storages = storages;
    this.currentStorageStatus = null;
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
  //  <li class="total-space">
  //    <span></span>
  //    <a data-l10n-id="total-space">Total space
  //      <span class="size"></span>
  //    </a>
  //  </li>
  //  </li>
  //    <label>
  //      <button data-l10n-id="format-sdcard" disabled="true">
  //      Format SD card
  //      </button>
  //    </label>
  //  </li>
  //  </li> <!-- unmount button for displaying external storage only -->
  //    <label>
  //      <button data-l10n-id="eject-sdcard" disabled="true">
  //      Eject SD card
  //      </button>
  //    </label>
  //  </li>
  //</ul>

  Volume.prototype.getVolumeId = function volume_getVolumeId() {
    return (this.external) ? 'external-' + this.externalIndex : 'internal';
  };

  Volume.prototype.getL10nId = function volume_getL10nId(useShort) {
    var prefix = useShort ? 'short-storage-name-' : 'storage-name-';
    return prefix + this.getVolumeId();
  };

  Volume.prototype.createView = function volume_createView(listRoot) {
    // declair re-useable variables
    var l10nId, li, label, text, size, anchor, button, buttonType;

    // create header
    var h2 = document.createElement('h2');
    l10nId = this.getL10nId();
    h2.setAttribute('data-l10n-id', l10nId);
    var header = document.createElement('header');
    header.appendChild(h2);
    header.dataset.id = this.getVolumeId();
    listRoot.appendChild(header);
    // create ul
    this.rootElement = document.createElement('ul');
    listRoot.appendChild(this.rootElement);

    var stackedbarDiv = document.createElement('div');
    stackedbarDiv.id = this.name + '-space-stackedbar';
    stackedbarDiv.classList.add('space-stackedbar');
    li = document.createElement('li');
    li.appendChild(stackedbarDiv);
    this.rootElement.appendChild(li);
    this.stackedbar = StackedBar(stackedbarDiv);

    var self = this;
    ITEM_TYPE.forEach(function(type) {
      label = document.createElement('span');
      label.classList.add('stackedbar-color-label');
      anchor = document.createElement('a');
      size = document.createElement('span');
      size.classList.add('size');
      size.hidden = true;
      text = document.createElement('span');
      l10nId = type + '-space';
      text.setAttribute('data-l10n-id', l10nId);
      anchor.appendChild(text);
      anchor.appendChild(size);
      li = document.createElement('li');
      li.classList.add('color-' + type);
      li.appendChild(label);
      li.appendChild(anchor);
      self.rootElement.appendChild(li);
    });

    anchor = document.createElement('a');
    size = document.createElement('span');
    size.classList.add('size');
    size.hidden = true;
    text = document.createElement('span');
    l10nId = 'total-space';
    text.setAttribute('data-l10n-id', l10nId);
    anchor.appendChild(text);
    anchor.appendChild(size);
    li = document.createElement('li');
    li.classList.add('total-space');
    li.appendChild(anchor);
    this.rootElement.appendChild(li);

    if (this.storages.sdcard.canBeFormatted) {
      buttonType = 'format-sdcard-' + this.getVolumeId();
      button = document.createElement('button');
      button.classList.add('format-btn');
      button.setAttribute('data-l10n-id', buttonType);
      button.disabled = true;
      button.onclick = this.formatSDCard.bind(this);
      label = document.createElement('label');
      label.appendChild(button);
      li = document.createElement('li');
      li.appendChild(label);
      this.rootElement.appendChild(li);
    }

    // Since bug 1007053 landed, deviceStorage API provides attribute
    // 'canBeFormatted', 'canBeMounted', 'canBeShared' for query capability.
    // Example: Some of the devices(Nexus 4/5) are not supported external
    // storage. And its internal storage is not supported format functionality.

    // Internal storage is not supported unmount(eject sdcard).
    if (this.external && this.storages.sdcard.canBeMounted) {
      buttonType = 'eject-sdcard-' + this.getVolumeId();
      button = document.createElement('button');
      button.classList.add('eject-btn');
      button.setAttribute('data-l10n-id', buttonType);
      button.disabled = true;
      button.onclick = this.unmountSDCard.bind(this);
      label = document.createElement('label');
      label.appendChild(button);
      li = document.createElement('li');
      li.classList.add('eject-btn');
      li.appendChild(label);
      this.rootElement.appendChild(li);
    }
  };

  Volume.prototype.updateStorageInfo = function volume_updateStorageInfo() {
    // Update the storage details
    var self = this;
    this.getStats(function(sizes) {
      self.stackedbar.reset();
      ITEM_TYPE.forEach(function(type) {
        var element =
          self.rootElement.querySelector('.color-' + type + ' .size');
        DeviceStorageHelper.showFormatedSize(
          element, 'storageSize', sizes[type]);
        element.hidden = false;
        self.stackedbar.add({ 'type': type, 'value': sizes[type] });
      });
      self.stackedbar.refreshUI();

      // update total space size
      var element =
        self.rootElement.querySelector('[data-l10n-id="total-space"] + .size');
      DeviceStorageHelper.showFormatedSize(element, 'storageSize',
                                           sizes.sdcard + sizes.free);
      element.hidden = false;
    });
  };

  Volume.prototype.enableStorageInfo =
    function volume_enableStorageInfo(enabled) {
    // the storage details
    ITEM_TYPE.forEach(function(type) {
      var rule = 'li[class="color-' + type + '"]';
      var element = this.rootElement.querySelector(rule);
      element.setAttribute('aria-disabled', !enabled);
    }.bind(this));

    // total space size
    var rule = 'li[class="total-space"]';
    var element = this.rootElement.querySelector(rule);
    element.setAttribute('aria-disabled', !enabled);
  };

  // Update external storage UI state only
  Volume.prototype.updateStorageUIState =
    function volume_updateStorageUIState(enabled, isUnrecognisedEventUpdate) {
    // If storage is formatting, we keep the information to figure out the
    // status. Just do early return.
    if (this.isFormatting && !enabled) {
      return;
    }

    // If storage is unrecognised, we keep the information to figure out the
    // status. Just do early return.
    if (this.isUnrecognised && !enabled) {
      return;
    }

    // If receive unrecognised event update with disabled request, and the
    // storage status is 'Mounted', let's ignore the update. Because settings
    // key 'volume.external.unrecognised' will be updated while volume storage
    // is detecting an inserted SD card every time. Sometimes, the key observer
    // event comes after 'storage-state-change' event. It will disable the
    // external storage information here.
    if (isUnrecognisedEventUpdate && !enabled &&
        (this.currentStorageStatus === 'Mounted')) {
      return;
    }

    // set enabled/disabled information for external storage only
    if (this.getVolumeId() === 'internal') {
      return;
    }

    // external storage header
    var rule = 'header[data-id=' + this.getVolumeId() + ']';
    this.rootElement.parentNode.querySelector(rule).hidden = !enabled;

    // external storage information
    this.rootElement.hidden = !enabled;

    // If storage is unrecognised, we just display header and format button.
    // Then, do early return from here.
    if (isUnrecognisedEventUpdate) {
      // set stacked bar to be hidden
      this.rootElement.querySelector('.space-stackedbar').parentNode.hidden =
        enabled;

      // set eject button to be hidden
      this.setUnmountSDCardBtnVisible(!enabled);

      // disable storage details, total space size
      // while the storage is unrecognised
      if (enabled) {
        // storage details
        ITEM_TYPE.forEach(function(type) {
          this.rootElement.querySelector(
            'li[class="color-' + type + '"]').hidden = enabled;
        }.bind(this));

        // total space size
        this.rootElement.querySelector(
          'li[class="total-space"]').hidden = enabled;
      }

      return;
    }

    // storage details
    ITEM_TYPE.forEach(function(type) {
      this.rootElement.querySelector(
        'li[class="color-' + type + '"]').hidden = !enabled;
    }.bind(this));

    // total space size
    this.rootElement.querySelector(
      'li[class="total-space"]').hidden = !enabled;
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
        if (current === 0) {
          storage.freeSpace().onsuccess = function(e) {
            results.free = e.target.result;
            if (callback) {
              callback(results);
            }
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
          self.updateStorageUIState(true);
          self.setInfoUnavailable();
          self.enableStorageInfo(false);
          break;
        case 'unavailable':
          self.setInfoUnavailable();
          self.enableStorageInfo(false);
          self.updateStorageUIState(false);
          break;
        case 'available':
          self.updateStorageUIState(true);
          self.updateStorageInfo();
          self.enableStorageInfo(true);
          self.enableUnmountSDCardBtn(true);
          self.enableFormatSDCardBtn(true);
          break;
      }
      if (callback) {
        callback(state);
      }
    };
  };

  Volume.prototype.updateUIState =
  function volume_updateUIState(storageStatus) {
    switch (storageStatus) {
      case 'Init':
      case 'NoMedia':
      case 'Pending':
      case 'Unmounting':
        this.updateStorageUIState(false);
        this.enableUnmountSDCardBtn(false);
        this.enableFormatSDCardBtn(false);
        break;
      case 'Shared':
      case 'Shared-Mounted':
        this.updateStorageUIState(true);
        this.enableUnmountSDCardBtn(false);
        this.enableFormatSDCardBtn(false);
        break;
      case 'Formatting':
        this.enableUnmountSDCardBtn(false);
        this.enableFormatSDCardBtn(false, true);
        // Set isFormatting flag to be false after button updated already,
        // because we can not reset it in idle status.
        this.isFormatting = false;
        break;
      case 'Checking':
        this.isFormatting = false;
        break;
      case 'Idle': // means Unmounted
        // pop up a toast to guide a user to remove SD card
        if (this.isUnmounting) {
          this.isUnmounting = false;
          var toast = {
            messageL10nId: 'sdcardUnmounted',
            latency: 3000,
            useTransition: true
          };
          // create toast
          Toaster.showToast(toast);
        }

        this.updateStorageUIState(false);
        this.enableUnmountSDCardBtn(false);
        break;
      case 'Mounted':
        this.updateStorageUIState(true);
        this.enableUnmountSDCardBtn(true);
        this.enableFormatSDCardBtn(true);
        break;
    }
  };

  Volume.prototype.setInfoUnavailable = function volume_setInfoUnavailable() {
    var self = this;
    ITEM_TYPE.forEach(function(type) {
      var rule = '.color-' + type + ' .size';
      var element = self.rootElement.querySelector(rule);
      element.setAttribute('data-l10n-id', 'size-not-available');
    });
    // set total space info.
    var element =
      this.rootElement.querySelector('.total-space .size');
    element.setAttribute('data-l10n-id', 'size-not-available');
    // stacked bar reset
    this.stackedbar.reset();
  };

  Volume.prototype.mountSDCard = function volume_mountSDCard(evt) {
    this.storages.sdcard.mount();
  };

  Volume.prototype.unmountSDCard = function volume_unmountSDCard(evt) {
    // Pop up a confirm window before unmount SD card.
    var popup = document.getElementById('unmount-sdcard-dialog');
    var cancelBtn = document.getElementById('unmount-sdcard-cancel-btn');
    var okBtn = document.getElementById('unmount-sdcard-ok-btn');

    var self = this;
    var confirmHandler = function() {
      enablePopup(false);
      // Unmount SD card
      self.storages.sdcard.unmount();
      self.isUnmounting = true;
    };

    var cancelHandler = function() {
      enablePopup(false);
    };

    var enablePopup = function Vf_enablePopup(enabled) {
      if (enabled) {
        okBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        popup.hidden = false;
      } else {
        okBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        popup.hidden = true;
      }
    };
    enablePopup(true);
  };

  Volume.prototype.formatSDCard = function volume_formatSDCard(evt) {
    // Pop up a confirm window before format SD card.
    var popup = document.getElementById('format-sdcard-dialog');
    var cancelBtn = document.getElementById('format-sdcard-cancel-btn');
    var okBtn = document.getElementById('format-sdcard-ok-btn');
    var dialogHeader = popup.querySelector('h1');
    var dialogContent = popup.querySelector('p');

    if (!this.external) {
      dialogHeader.setAttribute('data-l10n-id',
        'format-sdcard-internal-title');
      dialogContent.setAttribute('data-l10n-id',
        'format-sdcard-internal-message');
    } else {
      dialogHeader.setAttribute('data-l10n-id', 'format-sdcard-title');
      dialogContent.setAttribute('data-l10n-id', 'format-sdcard-message');
    }

    var self = this;
    var confirmHandler = function() {
      enablePopup(false);
      // Format SD card
      self.isFormatting = true;
      self.storages.sdcard.format();
    };

    var cancelHandler = function() {
      enablePopup(false);
    };

    var enablePopup = function Vf_enablePopup(enabled) {
      if (enabled) {
        okBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        popup.hidden = false;
      } else {
        okBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        popup.hidden = true;
      }
    };
    enablePopup(true);
  };

  Volume.prototype.enableUnmountSDCardBtn =
    function volume_enableUnmountSDCardBtn(enabled) {
    if (this.external && this.storages.sdcard.canBeMounted) {
      var rule = 'button[class="eject-btn"]';
      this.rootElement.querySelector(rule).disabled = !enabled;
      if (enabled) {
        this.setUnmountSDCardBtnVisible(enabled);
      }
    }
  };

  Volume.prototype.setUnmountSDCardBtnVisible =
    function volume_setUnmountSDCardBtnVisible(visible) {
    if (this.external && this.storages.sdcard.canBeMounted) {
      var rule = 'li[class="eject-btn"]';
      this.rootElement.querySelector(rule).hidden = !visible;
    }
  };

  Volume.prototype.enableFormatSDCardBtn =
    function volume_enableFormatSDCardBtn(enabled, isFormatting) {
    if (this.storages.sdcard.canBeFormatted) {
      // enable/disable button
      var formatBtn = this.rootElement.querySelector('.format-btn');
      formatBtn.disabled = !enabled;

      // update text description on button
      var l10nId = 'format-sdcard-' + this.getVolumeId();
      if (!enabled && isFormatting) {
        l10nId = 'formatting';
      }

      formatBtn.setAttribute('data-l10n-id', l10nId);
    }
  };

  var MediaStorage = {
    init: function ms_init() {
      this._volumeList = this.initAllVolumeObjects();

      this._handleExternalUnrecognisedChanged =
        this.handleExternalUnrecognisedChanged.bind(this);

      this._updateInfo = this.updateInfo.bind(this);

      this.documentStorageListener = false;
      this.usmEnabledVolume = {};
      this.umsVolumeShareState = false;

      // After updated listener, we will update information in the callback.
      this.updateListeners(this._updateInfo);

      // Use visibilitychange so that we don't get notified of device
      // storage notifications when the settings app isn't visible.
      document.addEventListener('visibilitychange', this);

      // default media location
      this.defaultMediaLocationList =
        document.querySelector('.default-media-location');
      this.defaultMediaLocation =
        document.getElementById('defaultMediaLocation');
      this.defaultMediaLocation.addEventListener('click', this);
      this.makeDefaultLocationMenu();

      window.addEventListener('localized', this);
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
        // XXX: This is a heuristic to determine whether a storage is internal
        // or external (e.g. a pluggable SD card). It does *not* work
        // in general, but it works for all officially-supported devices.
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

    handleEvent: function ms_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this.updateInfo();
          break;
        case 'change':
          if (evt.target.id === 'ums-switch') {
            Storage.umsMasterSettingChanged(evt);
          } else if (evt.target.id === 'defaultMediaLocation') {
            this.defaultLocationName = this.defaultMediaLocation.value;
          } else {
            // we are handling storage changes
            // possible state: available, unavailable, shared
            this.updateInfo();
          }
          break;
        case 'storage-state-change':
          var storageStatus = evt.reason;
          var storageName = evt.currentTarget.storageName;
          this.updateStorageStatus(storageStatus, storageName);
          break;
        case 'click':
          this.showChangingDefaultStorageConfirmation();
          break;
        case 'visibilitychange':
          this.updateListeners(this._updateInfo, true);
          break;
      }
    },

    makeDefaultLocationMenu: function ms_makeDefaultLocationMenu() {
      var self = this;
      SettingsCache.getSettings(function(allSettings) {
        self.defaultLocationName = allSettings[DEFAULT_MEDIA_VOLUME_KEY];
        var defaultName = allSettings[DEFAULT_MEDIA_VOLUME_KEY];
        var selectionMenu = self.defaultMediaLocation;
        var selectedIndex = 0;
        self._volumeList.forEach(function(volume, index) {
          var option = document.createElement('option');
          option.value = volume.name;
          var l10nId = volume.getL10nId(true);
          option.setAttribute('data-l10n-id', l10nId);
          selectionMenu.appendChild(option);
          if (defaultName && volume.name === defaultName) {
            selectedIndex = index;
          }
        });
        var selectedOption = selectionMenu.options[selectedIndex];
        selectedOption.selected = true;

        // disable option menu if we have only one option
        if (self._volumeList.length === 1) {
          self.enableDefaultMediaLocationSelection(false);
          var obj = {};
          obj[DEFAULT_MEDIA_VOLUME_KEY] = selectedOption.value;
          Settings.mozSettings.createLock().set(obj);
        } else if (self._volumeList.length > 1) {
          // Disable default media location selection menu if external storage
          // is not in slot.
          self.updateDefaultMediaLocation();

          // observe selection menu 'change' event for updating default location
          // name.
          selectionMenu.addEventListener('change', self);
        }
      });
    },

    showChangingDefaultStorageConfirmation:
    function ms_showChangingDefaultStorageConfirmation() {
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

    updateListeners: function ms_updateListeners(callback, isVisibilitychange) {
      var self = this;
      if (document.hidden) {
        // Settings is being hidden. Unregister our change listener so we won't
        // get notifications whenever files are added in another app.
        if (this.documentStorageListener) {
          this._volumeList.forEach(function(volume) {
            // use sdcard storage to represent this volume
            var volumeStorage = volume.storages.sdcard;
            volumeStorage.removeEventListener('change', self);
            volumeStorage.removeEventListener('storage-state-change', self);
          });

          // Unobserve 'unrecognised' state for external storage.
          Settings.mozSettings.removeObserver(
            EXTERNAL_UNRECOGNISED_KEY,
            this._handleExternalUnrecognisedChanged
          );

          this.documentStorageListener = false;
        }
      } else {
        if (!this.documentStorageListener) {
          this._volumeList.forEach(function(volume) {
            // use sdcard storage to represent this volume
            var volumeStorage = volume.storages.sdcard;
            volumeStorage.addEventListener('change', self);
            volumeStorage.addEventListener('storage-state-change', self);
          });

          // Init format SD card button for unrecognised storage.
          SettingsCache.getSettings(function(allSettings) {
            var isUnrecognised = allSettings[EXTERNAL_UNRECOGNISED_KEY];
            this.enableFormatSDCardBtnForUnrecognisedStorage(isUnrecognised);
            // Update storage information after checked the storage unrecognised
            // status already.
            if (callback) {
              callback();
            }

            // Update default media location.
            // If there is only one storage, do nothing.
            if (isVisibilitychange && (this._volumeList.length > 1)) {
              this.updateDefaultMediaLocation();
            }
          }.bind(this));

          // Observe 'unrecognised' state for external storage.
          Settings.mozSettings.addObserver(
            EXTERNAL_UNRECOGNISED_KEY,
            this._handleExternalUnrecognisedChanged
          );

          this.documentStorageListener = true;
        }
      }
    },

    enableFormatSDCardBtnForUnrecognisedStorage:
    function ms_enableFormatSDCardBtnForUnrecognisedStorage(enabled) {
      if (this._volumeList.length === 1) {
        // one volume only, it should be an external storage
        // enable header to display storage name
        this._volumeList[0].isUnrecognised = enabled;
        this._volumeList[0].updateStorageUIState(enabled, true);
        // enable format button
        this._volumeList[0].enableFormatSDCardBtn(enabled);
      } else if (this._volumeList.length > 1) {
        this._volumeList.forEach(function(volume) {
          // The storage name is mapping to a hard code name. Because name of
          // some external storeages are different. Such as, Flame: 'external',
          // Helix: 'extsdcard'.
          if (volume.external) {
            // External
            // enable header to display storage name
            volume.isUnrecognised = enabled;
            volume.updateStorageUIState(enabled, true);
            // enable format button
            volume.enableFormatSDCardBtn(enabled);
          }
        }.bind(this));
      }
    },

    handleExternalUnrecognisedChanged:
    function ms_handleExternalUnrecognisedChanged(event) {
      this.enableFormatSDCardBtnForUnrecognisedStorage(event.settingValue);
    },

    updateInfo: function ms_updateInfo() {
      var self = this;
      this.umsVolumeShareState = false;
      this._volumeList.forEach(function(volume) {
        volume.updateInfo(function(state) {
          if (state === 'shared') {
            self.umsVolumeShareState = true;
          }
        });
      });
    },

    // update storage status corresponding to each volume storage
    updateStorageStatus:
    function ms_updateStorageStatus(storageStatus, storageName) {
      if (this._volumeList.length === 1) {
        // one volume only, so fire event to the volume instance directly
        this._volumeList[0].currentStorageStatus = storageStatus;
        this._volumeList[0].updateUIState(storageStatus);
      } else if (this._volumeList.length > 1) {
        this._volumeList.forEach(function(volume) {
          // The storage name is mapping to a hard code name. Because name of
          // some external storeages are different. Such as, Flame: 'external',
          // Helix: 'extsdcard'.
          if ((storageName !== 'sdcard') && volume.external) {
            // External
            volume.currentStorageStatus = storageStatus;
            volume.updateUIState(storageStatus);
          } else if ((storageName === 'sdcard') && !volume.external) {
            // Internal
            volume.currentStorageStatus = storageStatus;
            volume.updateUIState(storageStatus);
          }
        }.bind(this));

        // Update default location. If there is only one storage, do nothing.
        if (storageStatus !== 'Mounted') {
          this.enableDefaultMediaLocationSelection(false);
          // If default storage is external, change it to be internal.
          if ((storageName !== 'sdcard') &&
              (this.defaultLocationName !== 'sdcard')) {
            if (storageStatus === 'NoMedia') {
              // Change the default storage to be internal.
              this.setInternalStorageBeDefaultMediaLocation();
            } else if (storageStatus === 'Idle') {
              // Change the default storage to be internal, if the storage
              // status is still in 'Idle'. Because 'Shared', 'Formatting'
              // status will go through 'Idle' status.
              setTimeout(function() {
                if (this._volumeList[1].currentStorageStatus === 'Idle') {
                  this.setInternalStorageBeDefaultMediaLocation();
                }
              }.bind(this), LATENCY_CHECK_STATUS_AFTER_IDLE_IN_MILLISECONDS);
            }
          }
        } else if (storageName !== 'sdcard') {
          // Only enable default media location
          // in case of external storage event
          this.enableDefaultMediaLocationSelection(true);
        }
      }
    },

    updateDefaultMediaLocation: function ms_updateDefaultMediaLocation() {
      // Disable default media location selection menu if external storage
      // is not in slot.
      var externalVolume = this._volumeList[1];
      if (externalVolume.storages && externalVolume.storages.sdcard) {
        var self = this;
        var storageStatusReq =
          externalVolume.storages.sdcard.storageStatus();
        storageStatusReq.onsuccess = function storageStatusSuccess(evt) {
          // save status
          self._volumeList[1].currentStorageStatus = evt.target.result;
          var storageStatus = evt.target.result;
          if (storageStatus !== 'Mounted') {
            self.enableDefaultMediaLocationSelection(false);
            // If default storage is external, change it to be internal.
            if (self.defaultLocationName !== 'sdcard') {
              if (storageStatus === 'NoMedia') {
                // Change the default storage to be internal.
                self.setInternalStorageBeDefaultMediaLocation();
              } else if (storageStatus === 'Idle') {
                // Change the default storage to be internal, if the storage
                // status is still in 'Idle'. Because 'Shared', 'Formatting'
                // status will go through 'Idle' status.
                setTimeout(function() {
                  if (self._volumeList[1].currentStorageStatus === 'Idle') {
                    self.setInternalStorageBeDefaultMediaLocation();
                  }
                }, LATENCY_CHECK_STATUS_AFTER_IDLE_IN_MILLISECONDS);
              }
            }
          } else {
            self.enableDefaultMediaLocationSelection(true);
          }
        };
      }
    },

    setInternalStorageBeDefaultMediaLocation:
    function ms_setInternalStorageBeDefaultMediaLocation() {
      var selectedOption = this.defaultMediaLocation.options[0];
      selectedOption.selected = true;
      var obj = {};
      obj[DEFAULT_MEDIA_VOLUME_KEY] = selectedOption.value;
      Settings.mozSettings.createLock().set(obj);
    },

    enableDefaultMediaLocationSelection:
    function ms_enableDefaultMediaLocationSelection(enabled) {
      this.defaultMediaLocationList.setAttribute('aria-disabled', !enabled);
      this.defaultMediaLocation.disabled = !enabled;
      this.defaultMediaLocation.parentNode.setAttribute('aria-disabled',
                                                        !enabled);
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
        container.parentNode.setAttribute('aria-disabled', false);
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
        container.parentNode.setAttribute('aria-disabled', true);
        container.parentNode.hidden = true;
      }
    };
  };

  MediaStorage.init();
});
