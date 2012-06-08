
var SettingsListener = {
  _callbacks: {},

  init: function sl_init() {
    if ('mozSettings' in navigator && navigator.mozSettings)
      navigator.mozSettings.onsettingchange = this.onchange.bind(this);
  },

  onchange: function sl_onchange(evt) {
    var callback = this._callbacks[evt.settingName];
    if (callback) {
      callback(evt.settingValue);
    }
  },

  observe: function sl_observe(name, defaultValue, callback) {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      window.setTimeout(function() { callback(defaultValue); });
      return;
    }

    var req = settings.getLock().get(name);
    req.addEventListener('success', (function onsuccess() {
      callback(typeof(req.result[name]) != 'undefined' ?
        req.result[name] : defaultValue);
    }));

    this._callbacks[name] = callback;
  }
};

SettingsListener.init();

/* === Language === */
SettingsListener.observe('language.current', 'en-US', function(value) {
  document.mozL10n.language.code = value;
  document.documentElement.lang = document.mozL10n.language.code;
  document.documentElement.dir = document.mozL10n.language.direction;

  setTimeout(function() {
    appscreen.build(true);
  });
});

/* === Wallpapers === */
SettingsListener.observe('homescreen.wallpaper', 'default.png',
  function(value) {
    document.getElementById('home').style.backgroundImage =
      'url(style/backgrounds/' + value + ')';
  }
);

