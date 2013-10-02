/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ContextMenu = {
  init: function cm_init() {
    window.addEventListener('mozbrowsercontextmenu', this, true);
  },

  handleEvent: function cm_handleEvent(evt) {
    var detail = evt.detail;
    if (!detail.contextmenu || detail.contextmenu.items.length == 0)
      return;

    var onsuccess = function(action) {
      detail.contextMenuItemSelected(action);
    };

    ActionMenu.open(detail.contextmenu.items, '', onsuccess);
    evt.preventDefault();
  }
};

ContextMenu.init();
