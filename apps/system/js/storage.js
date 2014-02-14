var Storage = {

  automounterDisable: 0,
  automounterEnable: 1,
  automounterDisableWhenUnplugged: 2,

  umsEnabled: 'ums.enabled',
  umsMode: 'ums.mode',
  _mode: undefined,

  init: function storageInit() {
    var self = this;
    this.setMode(this.automounterDisable, 'init');
    window.addEventListener('lock', this);
    window.addEventListener('unlock', this);

    SettingsListener.observe(this.umsEnabled, false, function umsChanged(val) {
      self._mode = Storage.modeFromBool(val);
      if (lockScreen && lockScreen.locked) {
        // covers startup
        self.setMode(Storage.automounterDisable, 'screen locked');
      } else {
        self.setMode(self._mode, 'change in ums.enabled');
      }
    });
  },

  modeFromBool: function storageModeFromBool(val) {
     return val ? this.automounterEnable : this.automounterDisable;
  },

  setMode: function storageSetMode(val, reason) {
    if (!window.navigator.mozSettings)
      return;

    //console.info('Setting', this.umsMode, 'to', val, 'due to', reason);
    var param = {};
    param[this.umsMode] = val;
    SettingsListener.getSettingsLock().set(param);
  },

  handleEvent: function storageHandleEvent(e) {
    switch (e.type) {
      case 'lock':
        this.setMode(this.automounterDisableWhenUnplugged, 'screen locked');
        break;
      case 'unlock':
        if (!window.navigator.mozSettings)
          return;

        if (typeof(this._mode) == 'undefined')
          return;

        this.setMode(this._mode, 'screen unlocked');
        break;
      default:
        return;
    }
  }
};

Storage.init();
