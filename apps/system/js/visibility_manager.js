(function(window) {
  // When an UI layer is overlapping the current app,
  // WindowManager should set the visibility of app iframe to false
  // And reset to true when the layer is gone.
  // We may need to handle windowclosing, windowopened in the future.
  var VisibilityManager = {
    _attentionScreenTimer: null,

    _deviceLockedTimer: 0,

    overlayEvents: [
      'lock',
      'will-unlock',
      'attentionscreenshow',
      'attentionscreenhide',
      'status-active',
      'status-inactive',
      'mozChromeEvent'
    ],

    init: function vm_init() {
      this.overlayEvents.forEach(function overlayEventIterator(event) {
        window.addEventListener(event, this);
      }, this);
    },

    handleEvent: function vm_handleEvent(evt) {
      if (this._attentionScreenTimer && 'mozChromeEvent' != evt.type)
        clearTimeout(this._attentionScreenTimer);
      switch (evt.type) {
        case 'status-active':
        case 'attentionscreenhide':
        case 'will-unlock':
          if (LockScreen.locked)
            return;

          this.publish('showwindows');
          this.publish('showwindow');
          this._resetDeviceLockedTimer();
          break;
        case 'lock':
          this.publish('hidewindows');
          // If the audio is active, the app should not set non-visible
          // otherwise it will be muted.
          if (!this._normalAudioChannelActive) {
            this.publish('hidewindow', { screenshoting: false });
          }
          this._resetDeviceLockedTimer();
          break;

        /*
        * Because in-transition is needed in attention screen,
        * We set a timer here to deal with visibility change
        */
        case 'status-inactive':
          if (!AttentionScreen.isVisible())
            return;
        case 'attentionscreenshow':
          var detail = evt.detail;
          // XXX: Fix me by moving attentionscreen into appwindow
          // or move the callscreen transition into system app.
          if (detail && detail.origin &&
              detail.origin != WindowManager.getDisplayedApp()) {
            this._attentionScreenTimer = setTimeout(function setVisibility() {
              this.publish('hidewindow', { screenshoting: true });
            }.bind(this), 3000);
            this.publish('overlaystart');
          }
          break;
        case 'mozChromeEvent':
          if (evt.detail.type == 'visible-audio-channel-changed') {
            this._resetDeviceLockedTimer();

            if (this._normalAudioChannelActive &&
                evt.detail.channel !== 'normal' &&
                LockScreen.locked) {
              this._deviceLockedTimer = setTimeout(function setVisibility() {
                this.publish('hidewindow', { screenshoting: false });
              }.bind(this), 3000);
            }

            this._normalAudioChannelActive = (evt.detail.channel === 'normal');
          }
          break;
      }
    },

    _resetDeviceLockedTimer: function vm_resetDeviceLockedTimer() {
      if (this._deviceLockedTimer) {
        clearTimeout(this._deviceLockedTimer);
        this._deviceLockedTimer = 0;
      }
    },

    publish: function vm_publish(eventName, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(eventName, true, false, detail);
      window.dispatchEvent(evt);
    }
  };

  VisibilityManager.init();
}(this));
