/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var AttentionScreen = {
  get mainScreen() {
    delete this.mainScreen;
    return this.mainScreen = document.getElementById('screen');
  },

  get attentionScreen() {
    delete this.attentionScreen;
    return this.attentionScreen = document.getElementById('attention-screen');
  },

  get bar() {
    delete this.bar;
    return this.bar = document.getElementById('attention-bar');
  },

  init: function as_init() {
    window.addEventListener('mozbrowseropenwindow', this.open.bind(this), true);
    window.addEventListener('mozbrowserclose', this.close.bind(this), true);

    this.bar.addEventListener('click', this.show.bind(this));
    window.addEventListener('home', this.hide.bind(this));
  },

  open: function as_open(evt) {
    if (evt.detail.features != 'attention')
      return;

    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    var attentionFrame = evt.detail.frameElement;
    attentionFrame.dataset.frameType = 'attention';
    attentionFrame.dataset.frameName = evt.detail.name;
    attentionFrame.dataset.frameOrigin = evt.target.dataset.frameOrigin;

    this.attentionScreen.appendChild(attentionFrame);
    this.attentionScreen.classList.add('displayed');

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

    this.attentionScreen.classList.remove('displayed');
    this.mainScreen.classList.remove('active-statusbar');
    this.attentionScreen.classList.remove('status-mode');
    this.dispatchEvent('status-inactive');
    this.attentionScreen.removeChild(evt.target);

    if (this._screenInitiallyDisabled)
      ScreenManager.turnScreenOff(true);

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  show: function as_show() {
    this.attentionScreen.style.MozTransition = 'none';
    this.attentionScreen.classList.remove('status-mode');

    var self = this;
    window.addEventListener('MozAfterPaint', function finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', finishAfterPaint);
      setTimeout(function nextLoop() {
        self.attentionScreen.style.MozTransition = '';
        self.mainScreen.classList.remove('active-statusbar');
        self.dispatchEvent('status-inactive');
      });
    });
  },

  // Invoked when we get a "home" event
  hide: function as_hide() {
    if (this.attentionScreen.querySelectorAll('iframe').length > 0) {
      if (!this.mainScreen.classList.contains('active-statusbar')) {
        // The user is hiding the attention screen to use the phone we better
        // not turn the sreen off when the attention screen is closed.
        this._screenInitiallyDisabled = false;
        
        this.dispatchEvent('status-active');
        this.mainScreen.classList.add('active-statusbar');
        
        var attentionScreen = this.attentionScreen;
        attentionScreen.addEventListener('transitionend', function trWait() {
            attentionScreen.removeEventListener('transitionend', trWait);
            attentionScreen.classList.add('status-mode');
        });
      }
    }
  },

  dispatchEvent: function ls_dispatchEvent(name) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, null);
    window.dispatchEvent(evt);
  },

  showForOrigin: function as_showForOrigin(origin) {
    var iframes = this.attentionScreen.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].dataset.frameOrigin == origin) {
        this.show();
        break;
      }
    }
  }
};

AttentionScreen.init();
