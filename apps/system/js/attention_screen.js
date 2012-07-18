/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var AttentionScreen = {
  get mainScreen() {
    delete this.mainScreen;
    return this.mainScreen = document.getElementById('screen');
  },

  get screen() {
    delete this.screen;
    return this.screen = document.getElementById('attention-screen');
  },
  get bar() {
    delete this.bar;
    return this.bar = document.getElementById('attention-bar');
  },

  init: function as_init() {
    window.addEventListener('mozbrowseropenwindow', this.open.bind(this), true);
    window.addEventListener('mozbrowserclose', this.close.bind(this), true);

    this.bar.addEventListener('click', this.show.bind(this));
    window.addEventListener('keyup', this.hide.bind(this), true);
  },

  open: function as_open(evt) {
    if (evt.detail.features != 'attention')
      return;

    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    var attentionFrame = evt.detail.frameElement;
    attentionFrame.setAttribute('mozapp', evt.target.getAttribute('mozapp'));
    attentionFrame.dataset.frameType = 'attention';
    attentionFrame.dataset.frameName = evt.detail.name;
    attentionFrame.dataset.frameOrigin = evt.target.dataset.frameOrigin;

    // FIXME: won't be needed once
    // https://bugzilla.mozilla.org/show_bug.cgi?id=769182 is fixed
    attentionFrame.src = evt.detail.url;

    this.screen.appendChild(attentionFrame);
    this.screen.classList.add('displayed');

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
    this.mainScreen.classList.remove('active-statusbar');
    this.screen.classList.remove('status-mode');
    this.dispatchEvent('status-inactive');
    this.screen.removeChild(evt.target);

    if (this._screenInitiallyDisabled)
      ScreenManager.turnScreenOff();

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  show: function as_show() {
    this.screen.style.MozTransition = 'none';
    this.screen.classList.remove('status-mode');

    // hardening against the unavailability of MozAfterPaint
    var finished = false;

    var self = this;
    var finishTransition = function ch_finishTransition() {
      if (finished)
        return;

      if (securityTimeout) {
        clearTimeout(securityTimeout);
        securityTimeout = null;
      }

      finished = true;

      setTimeout(function nextLoop() {
        self.screen.style.MozTransition = '';
        self.mainScreen.classList.remove('active-statusbar');
        self.dispatchEvent('status-inactive');
      });
    };

    window.addEventListener('MozAfterPaint', function finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', finishAfterPaint);
      finishTransition();
    });
    var securityTimeout = window.setTimeout(finishTransition, 100);
  },

  hide: function as_hide(evt) {
    if (evt.keyCode == evt.DOM_VK_ESCAPE ||
        evt.keyCode == evt.DOM_VK_HOME) {

      if (this.screen.querySelectorAll('iframe').length > 0) {
        if (!this.mainScreen.classList.contains('active-statusbar')) {
          // The user is hiding the attention screen to use the phone we better
          // not turn the sreen off when the attention screen is closed.
          this._screenInitiallyDisabled = false;

          this.dispatchEvent('status-active');
          this.mainScreen.classList.add('active-statusbar');

          var screen = this.screen;
          screen.addEventListener('transitionend', function trWait() {
            screen.removeEventListener('transitionend', trWait);
            screen.classList.add('status-mode');
          });
        }
      }
    }
  },

  dispatchEvent: function ls_dispatchEvent(name) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, null);
    window.dispatchEvent(evt);
  },

  showForOrigin: function as_showForOrigin(origin) {
    var iframes = this.screen.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].dataset.frameOrigin == origin) {
        this.show();
        break;
      }
    }
  }
};

AttentionScreen.init();
