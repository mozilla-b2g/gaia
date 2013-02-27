/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SettingsUI = {
  get settings() {
    delete this.settings;
    return this.settings = document.getElementById('settings');
  },
  get downloadOptions() {
    delete this.downloadOptions;
    return this.downloadOptions = document.getElementById('download-option');
  },
  get settingsBack() {
    delete this.settingsBack;
    return this.settingsBack = document.getElementById('settings-back');
  },

  isReady: false,
  init: function thlui_init() {
    if (this.isReady)
      return;

    this.isReady = true;
    this.settingsBack.addEventListener('click', this.hide.bind(this));
    this.downloadOptions.addEventListener('click',
                                          this.onDownloadOption.bind(this));
  },
  show: function su_show() {
    this.settings.classList.add('show');
  },
  hide: function su_hide() {
    this.settings.classList.remove('show');
    window.location.hash = '';
  },
  onDownloadOption: function su_onDownloadOption(evt) {
    var target = evt.target;
    var button = target.getElementsByTagName('input')[0];
    button.checked = true;
    //TODO : Call MMS settings API to set download option
  }
};
