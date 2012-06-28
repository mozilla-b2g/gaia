/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var PopupManager = {
  _currentPopup: null,

  get container() {
    delete this.container;
    return this.container = document.getElementById('popup-container');
  },

  init: function pm_init() {
    window.addEventListener('mozbrowseropenwindow', this);
    window.addEventListener('mozbrowserclose', this);

    window.addEventListener('keyup', this, true);
  },

  handleEvent: function pm_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowseropenwindow':
        this.open(evt);
        break;
      case 'mozbrowserclose':
        this.close(evt);
        break;
      case 'keyup':
        this.backHandling(evt);
        break;
    }
  },

  open: function pm_open(evt) {
    // only one popup at a time
    if (this._currentPopup)
      return;

    this._currentPopup = evt.detail.frameElement;
    var popup = this._currentPopup;
    popup.setAttribute('mozbrowser', 'true');
    popup.dataset.frameType = 'popup';
    popup.src = evt.detail.url;

    this.container.appendChild(popup);
    this.container.classList.add('displayed');
  },

  close: function pm_close(evt) {
    var target = evt ? evt.target : this._currentPopup;

    this.container.classList.remove('displayed');

    var self = this;
    this.container.addEventListener('transitionend', function trWait() {
      self.container.removeEventListener('transitionend', trWait);
      self.container.removeChild(target);

      self._currentPopup = null;
    });

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  backHandling: function pm_backHandling(evt) {
    if (!this._currentPopup)
      return;

    if (evt.keyCode == evt.DOM_VK_ESCAPE ||
        evt.keyCode == evt.DOM_VK_HOME) {

      this.close();
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
};

PopupManager.init();
