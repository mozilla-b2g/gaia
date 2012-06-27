/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var AttentionScreen = {
  get screen() {
    delete this.screen;
    return this.screen = document.getElementById('attention-screen');
  },
  get bar() {
    delete this.bar;
    return this.bar = document.getElementById('attention-bar');
  },

  init: function as_init() {
    window.addEventListener('mozbrowseropenwindow', this, true);
    window.addEventListener('mozbrowserclose', this, true);

    this.bar.addEventListener('click', this);
    window.addEventListener('keyup', this, true);
  },

  handleEvent: function as_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowseropenwindow':
        this.open(evt);
        break;
      case 'mozbrowserclose':
        this.close(evt);
        break;
      case 'keyup':
        this.hide(evt);
        break;
      case 'click':
        this.show();
        break;
    }
  },

  open: function as_open(evt) {
    if (evt.detail.features != 'attention')
      return;

    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    var attentionFrame = evt.detail.frameElement;
    attentionFrame.setAttribute('mozbrowser', 'true');
    attentionFrame.setAttribute('mozapp', evt.target.getAttribute('mozapp'));
    attentionFrame.dataset.frameType = 'attention';
    attentionFrame.dataset.frameName = evt.detail.name;
    attentionFrame.dataset.frameOrigin = evt.target.dataset.frameOrigin;
    attentionFrame.src = evt.detail.url;

    this.screen.appendChild(attentionFrame);
    this.screen.classList.add('displayed');

    // XXX: before probing ScreenManager.screenEnabled,
    // sync it's value with mozPower
    ScreenManager._syncScreenEnabledValue();

    // We want the user attention, so we need to turn the screen on
    // if it's off.
    this._screenInitiallyDisabled = !ScreenManager.screenEnabled;
    if (this._screenInitiallyDisabled)
      ScreenManager.turnScreenOn();

    // Ensuring the proper mozvisibility changed on the displayed app
    var displayedOrigin = WindowManager.getDisplayedApp();
    if (displayedOrigin) {
      var frame = WindowManager.getAppFrame(displayedOrigin);
      if ('setVisible' in frame) {
        frame.setVisible(false);
      }
    }
  },

  close: function as_close(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'attention')
      return;

    // Ensuring the proper mozvisibility changed on the displayed app
    var displayedOrigin = WindowManager.getDisplayedApp();
    if (displayedOrigin) {
      var frame = WindowManager.getAppFrame(displayedOrigin);
      if ('setVisible' in frame) {
        frame.setVisible(true);
      }
    }

    this.screen.classList.remove('displayed');
    this.screen.classList.remove('status');
    this.screen.removeChild(evt.target);

    if (this._screenInitiallyDisabled)
      ScreenManager.turnScreenOff();

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  show: function as_show() {
    this.screen.classList.remove('status');
  },

  hide: function as_hide(evt) {
    if (evt.keyCode == evt.DOM_VK_ESCAPE ||
        evt.keyCode == evt.DOM_VK_HOME) {

      if (this.screen.querySelectorAll('iframe').length > 0) {
        if (!this.screen.classList.contains('status')) {
          this.screen.classList.add('status');

          // The user is hiding the attention screen to use the phone we better
          // not turn the sreen off when the attention screen is closed.
          this._screenInitiallyDisabled = false;

          evt.preventDefault();
          evt.stopPropagation();
        }
      }
    }
  }
};

AttentionScreen.init();
