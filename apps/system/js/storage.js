var Storage = {

  automounterDisable: 0,
  automounterEnable: 1,
  automounterDisableWhenUnplugged: 2,

  umsEnabled: 'ums.enabled',
  umsMode: 'ums.mode',

  init: function storageInit() {
    this.setMode(this.automounterDisable, 'init');
    window.addEventListener('lock', this);
    window.addEventListener('unlock', this);

    SettingsListener.observe(this.umsEnabled, false, function umsChanged(val) {
      if (LockScreen.locked) {
        // covers startup
        Storage.setMode(Storage.automounterDisable, 'screen locked');
      } else {
        Storage.setMode(Storage.modeFromBool(val), 'change in ums.enabled');
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

        var req = SettingsListener.getSettingsLock().get(this.umsEnabled);
        req.onsuccess = function umsEnabledFetched() {
          var mode = Storage.modeFromBool(req.result[Storage.umsEnabled]);
          Storage.setMode(mode, 'screen unlocked');
        };
        break;
      default:
        return;
    }
  }
};

Storage.init();
