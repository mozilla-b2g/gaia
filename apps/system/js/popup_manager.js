/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var PopupManager = {
  _currentPopup: null,
  _wait: null,
  _endTimes: 0,
  _startTimes: 0,

  overlay: document.getElementById('dialog-overlay'),

  container: document.getElementById('popup-container'),

  screen: document.getElementById('screen'),

  init: function pm_init() {
    window.addEventListener('mozbrowseropenwindow', this.open.bind(this));
    window.addEventListener('mozbrowserclose', this.close.bind(this));

    window.addEventListener('home', this.backHandling.bind(this));
  },

  _showWait: function pm_showWait() {
     var div = this._wait = document.createElement('div');
     var img = document.createElement('img');
     img.src = 'style/images/progress.gif';
     div.appendChild(img);
     div.classList.add('curtain');

    this.container.appendChild(div);
  },

  _hideWait: function pm_hideWait() {
    this.container.removeChild(this._wait);
    this._wait = null;
  },

  open: function pm_open(evt) {
    // only one popup at a time
    if (this._currentPopup)
      return;

    this._currentPopup = evt.detail.frameElement;
    var popup = this._currentPopup;
    popup.dataset.frameType = 'popup';
    popup.dataset.frameName = evt.detail.name;
    popup.dataset.frameOrigin = evt.target.dataset.frameOrigin;

    this.container.appendChild(popup);

    this.screen.classList.add('popup');

    popup.addEventListener('mozbrowserloadend',this);
    popup.addEventListener('mozbrowserloadstart',this);
  },

  handleLoadStart: function pm_handleLoadStart(evt) {
     this._startTimes++;
     if(this._startTimes > 1) {
      this._showWait();
     }
  },

  handleLoadEnd: function pm_handleLoadEnd(evt) {
      this._endTimes++;
      if(this._endTimes > 1) {
        this._hideWait();
      }
  },

  handleEvent: function pm_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowserloadstart':
        this.handleLoadStart(evt);
        break;
      case 'mozbrowserloadend':
        this.handleLoadEnd(evt);
        break;
    }
  },

  close: function pm_close(evt) {
    if (evt && (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'popup'))
      return;

    this.screen.classList.remove('popup');

    var self = this;
    this.container.addEventListener('transitionend', function trWait() {
      self.container.removeEventListener('transitionend', trWait);
      self.container.removeChild(self._currentPopup);
      self._currentPopup = null;
    });

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  backHandling: function pm_backHandling(evt) {
    if (!this._currentPopup)
      return;

    this.close();
    evt.stopImmediatePropagation();
  }
};

PopupManager.init();
