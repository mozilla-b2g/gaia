/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*exported WaitingScreen */

'use strict';

var WaitingScreen = {
  get loading() {
    delete this.loading;
    return (this.loading = document.getElementById('loading'));
  },
  get loadingHeader() {
    delete this.loadingHeader;
    return (this.loadingHeader = document.getElementById('loading-header'));
  },
  show: function ws_show() {
    this.loading.classList.add('show-loading');
  },
  hide: function ws_hide() {
    this.loading.classList.remove('show-loading');
  }
};
