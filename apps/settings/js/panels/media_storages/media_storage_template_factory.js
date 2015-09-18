/* global DeviceStorageHelper */
/**
 * The template function for generating an UI element for an item of volume.
 *
 * @module media_storages/media_storage_template_factory
 */
define(function() {
  'use strict';

  var StackedBar = require('modules/media_storages/stacked_bar');

  const ITEM_TYPE = ['music', 'pictures', 'videos', 'free'];

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function mstf_debug(msg) {
      console.log('--> [MediaStorageTemplateFactory]: ' + msg);
    };
  }

  function mediaStorageTemplate(onItemClick, observableItem) {
    var volume = observableItem;
    var elements;

    // create header
    var h2 = document.createElement('h2');
    var volumeId =
      (volume.isExternal) ? 'external-' + volume.externalIndex : 'internal';
    var headerl10nId = 'storage-name-' + volumeId;
    h2.setAttribute('data-l10n-id', headerl10nId);
    var header = document.createElement('header');
    header.appendChild(h2);
    // header.dataset.id = this.getVolumeId();
    // create ul
    var volumeUl = document.createElement('ul');
    elements.volumeUl = volumeUl;

    var stackedbarDiv = document.createElement('div');
    stackedbarDiv.id = volume.name + '-space-stackedbar';
    stackedbarDiv.classList.add('space-stackedbar');
    var stackedbarLi = document.createElement('li');
    stackedbarLi.appendChild(stackedbarDiv);
    volumeUl.appendChild(stackedbarLi);
    var stackedbar = StackedBar(stackedbarDiv);
    elements.stackedbar = stackedbar;

    var anchor, label, li, l10nId, size, text;
    ITEM_TYPE.forEach((type) => {
      label = document.createElement('span');
      label.classList.add('stackedbar-color-label');
      anchor = document.createElement('a');
      size = document.createElement('span');
      size.classList.add('size');
      size.hidden = true;
      elements[type + 'sizeSpan'] = size;
      text = document.createElement('span');
      l10nId = type + '-space';
      text.setAttribute('data-l10n-id', l10nId);
      anchor.appendChild(text);
      anchor.appendChild(size);
      li = document.createElement('li');
      li.classList.add('color-' + type);
      elements[type + 'sizeLi'] = li;
      li.appendChild(label);
      li.appendChild(anchor);
      volumeUl.appendChild(li);
    });

    anchor = document.createElement('a');
    size = document.createElement('span');
    size.classList.add('size');
    size.hidden = true;
    elements.totalsizeSpan = size;
    text = document.createElement('span');
    l10nId = 'total-space';
    text.setAttribute('data-l10n-id', l10nId);
    anchor.appendChild(text);
    anchor.appendChild(size);
    li = document.createElement('li');
    li.classList.add('total-space');
    elements.totalsizeLi = li;
    li.appendChild(anchor);
    volumeUl.appendChild(li);

    var button, buttonType;
    if (volume.canBeFormatted) {
      buttonType = 'format-sdcard-' + volumeId;
      button = document.createElement('button');
      button.classList.add('format-btn');
      button.setAttribute('data-l10n-id', buttonType);
      button.disabled = true;
      // Register the handler for the click event.
      if (typeof onItemClick === 'function') {
        button.onclick = function() {
          onItemClick({
            type: 'format',
            date: observableItem
          });
        };
      }
      label = document.createElement('label');
      label.appendChild(button);
      li = document.createElement('li');
      li.appendChild(label);
      volumeUl.appendChild(li);
    }

    // Since bug 1007053 landed, deviceStorage API provides attribute
    // 'canBeFormatted', 'canBeMounted', 'canBeShared' for query capability.
    // Example: Some of the devices(Nexus 4/5) are not supported external
    // storage. And its internal storage is not supported format functionality.

    // Internal storage is not supported unmount(eject sdcard).
    if (volume.isExternal && volume.canBeMounted) {
      buttonType = 'eject-sdcard-' + volumeId;
      button = document.createElement('button');
      button.classList.add('eject-btn');
      button.setAttribute('data-l10n-id', buttonType);
      button.disabled = true;
      // Register the handler for the click event.
      if (typeof onItemClick === 'function') {
        button.onclick = function() {
          onItemClick({
            type: 'unmount',
            date: observableItem
          });
        };
      }
      label = document.createElement('label');
      label.appendChild(button);
      li = document.createElement('li');
      li.classList.add('eject-btn');
      li.appendChild(label);
      volumeUl.appendChild(li);
    }

    var volumeDiv = document.createElement('div');
    volumeDiv.appendChild(header);
    volumeDiv.appendChild(volumeUl);

    // Observe 'musicUsedSpace' property for update music media storage info.
    volume.observe('musicUsedSpace', function(usedSpace) {
      _updateStorageSize({type: 'music', size: usedSpace}, volumeUl);
      _updateStackedBar(stackedbar, volume);
    });

    // Observe 'picturesUsedSpace' property for update pic media storage info.
    volume.observe('picturesUsedSpace', function(usedSpace) {
      _updateStorageSize({type: 'pictures', size: usedSpace}, volumeUl);
      _updateStackedBar(stackedbar, volume);
    });

    // Observe 'videosUsedSpace' property for update vidoes media storage info.
    volume.observe('videosUsedSpace', function(usedSpace) {
      _updateStorageSize({type: 'vidoes', size: usedSpace}, volumeUl);
      _updateStackedBar(stackedbar, volume);
    });

    // Observe 'volumeFreeSpace' property for update free volume info.
    volume.observe('volumeFreeSpace', function(freeSpace) {
      _updateStorageSize({type: 'free', size: freeSpace}, volumeUl);
      _updateStackedBar(stackedbar, volume);
    });

    // Update all media storage size.
    _updateStorageSize({type: 'music', size: volume.musicUsedSpace}, volumeUl);
    _updateStorageSize({type: 'pictures', size: volume.picturesUsedSpace},
                       volumeUl);
    _updateStorageSize({type: 'vidoes', size: volume.videosUsedSpace},
                       volumeUl);
    _updateStorageSize({type: 'free', size: volume.volumeFreeSpace}, volumeUl);

    // Update total space size.
    _updateStorageSize({
      type: 'total',
      size: volume.sdcardUsedSpace + volume.volumeFreeSpace
    }, volumeUl);

    // Update stacked bar.
    _updateStackedBar(stackedbar, volume);

    // Observe 'availableState' property for update each media storage, 
    // format/eject button enabled/disabled state.
    volume.observe('availableState', function(newState) {
      _enableStorageLayout(newState, volumeUl, stackedbar, volume);
    });

    return volumeDiv;
  }

  function _updateStorageSize(options, volumeUl) {
    var element;
    if (options.type === 'total') {
      // update total space size
      element =
        volumeUl.querySelector('[data-l10n-id="total-space"] + .size');
      DeviceStorageHelper.showFormatedSize(element,
                                           'storageSize',
                                           options.size);
    } else {
      // update specific media type
      element = volumeUl.querySelector('.color-' + options.type + ' .size');
      DeviceStorageHelper.showFormatedSize(element,
                                           'storageSize',
                                           options.size);
    }
  }

  function _updateStackedBar(stackedbar, volume) {
    stackedbar.reset();
    stackedbar.add({ 'type': 'music', 'value': volume.musicUsedSpace });
    stackedbar.add({ 'type': 'pictures', 'value': volume.picturesUsedSpace });
    stackedbar.add({ 'type': 'videos', 'value': volume.videosUsedSpace });
    stackedbar.add({ 'type': 'free', 'value': volume.volumeFreeSpace });
    stackedbar.refreshUI();
  }

  function _enableStorageLayout(state, volumeUl, stackedbar, volume) {
    switch (state) {
      case 'shared':
        _setStorageInfoUnavailable(volumeUl);
        stackedbar.reset();
        _enableStorageInfo(false, volumeUl);
        break;
      case 'unavailable':
        _setStorageInfoUnavailable(volumeUl);
        stackedbar.reset();
        _enableStorageInfo(false, volumeUl);
        break;
      case 'available':
        _enableStorageInfo(true, volumeUl);
        _enableUnmountSDCardBtn(true, volumeUl, volume);
        _enableFormatSDCardBtn(true, volumeUl, volume);
        break;
    }
  }

  function _enableStorageInfo(enabled, volumeUl) {
    // the storage details
    ITEM_TYPE.forEach(function(type) {
      var rule = 'li[class="color-' + type + '"]';
      var element = volumeUl.querySelector(rule);
      element.setAttribute('aria-disabled', !enabled);
    });
    // total space size
    var rule = 'li[class="total-space"]';
    var element = volumeUl.querySelector(rule);
    element.setAttribute('aria-disabled', !enabled);
  }

  function _setStorageInfoUnavailable(volumeUl) {
    ITEM_TYPE.forEach(function(type) {
      var rule = '.color-' + type + ' .size';
      var element = volumeUl.querySelector(rule);
      element.setAttribute('data-l10n-id', 'size-not-available');
    });
    // set total space info
    var element =
      volumeUl.querySelector('.total-space .size');
    element.setAttribute('data-l10n-id', 'size-not-available');
  }

  function _enableUnmountSDCardBtn(enabled, volumeUl, volume) {
    if (volume.isExternal && volume.canBeMounted) {
      var rule = 'button[class="eject-btn"]';
      volumeUl.querySelector(rule).disabled = !enabled;
      if (enabled) {
        _setUnmountSDCardBtnVisible(enabled, volumeUl, volume);
      }
    }
  }

  function _setUnmountSDCardBtnVisible(visible, volumeUl, volume) {
    if (volume.isExternal && volume.canBeMounted) {
      var rule = 'li[class="eject-btn"]';
      volumeUl.querySelector(rule).hidden = !visible;
    }
  }

  function _enableFormatSDCardBtn(enabled, volumeUl, volume, isFormatting) {
    if (volume.canBeFormatted) {
      // enable/disable button
      var formatBtn = volumeUl.querySelector('.format-btn');
      formatBtn.disabled = !enabled;
      // update text description on button
      var volumeId =
        (volume.isExternal) ? 'external-' + volume.externalIndex : 'internal';
      var l10nId = 'format-sdcard-' + volumeId;
      if (!enabled && isFormatting) {
        l10nId = 'formatting';
      }
      formatBtn.setAttribute('data-l10n-id', l10nId);
    }
  }

  return function ctor_mediaStorageTemplate(onItemClick) {
    return mediaStorageTemplate.bind(null, onItemClick);
  };
});
