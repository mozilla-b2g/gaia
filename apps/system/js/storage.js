var Storage = {

  automounter_disable: 0,
  automounter_enable: 1,
  automounter_disable_when_unplugged: 2,

  ums_enabled:  'ums.enabled',
  ums_mode:     'ums.mode',

  init: function storage_init() {
    window.addEventListener('unlocked', this);
    window.addEventListener('locked', this);

    SettingsListener.observe(Storage.ums_enabled, false, function(val) {
      if (LockScreen.locked) {
        // covers startup
        Storage.setMode(Storage.automounter_disable, 'screen locked');
      } else {
        Storage.setMode(Storage.modeFromBool(val), 'change in ums.enabled');
      }
    });
  },

  modeFromBool: function storage_modeFromBool(val) {
     return val ? Storage.automounter_enable : Storage.automounter_disable;
  },

  setMode: function storage_setMode(val, reason) {
    var settings = window.navigator.mozSettings;
    if (settings) {
      console.info('Setting', Storage.ums_mode, 'to', val, 'due to', reason);
      var param = {};
      param[Storage.ums_mode] = val;
      settings.getLock().set(param);
    }
  },

  handleEvent: function storage_handleEvent(e) {
    switch (e.type) {
      case 'locked':
        Storage.setMode(Storage.automounter_disable_when_unplugged, 'screen locked');
        break;
      case 'unlocked':
        var settings = window.navigator.mozSettings;
        var req = settings.getLock().get(Storage.ums_enabled);
        req.addEventListener('success', (function onsuccess() {
          Storage.setMode(Storage.modeFromBool(req.result[Storage.ums_enabled]), 'screen unlocked');
        }));
        break;
      default:
        return;
    }
  }
};

Storage.init();

