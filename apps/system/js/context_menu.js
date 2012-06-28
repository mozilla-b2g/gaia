/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ContextMenu = {
  init: function cm_init() {
    window.addEventListener('mozbrowsercontextmenu', this, true);
  },

  handleEvent: function cm_handleEvent(evt) {
    ListMenu.request(evt.detail.contextmenu.items, function sm_clickHandler(action) {
      evt.detail.contextMenuItemSelected(action);
    });
  }
};

ContextMenu.init();
