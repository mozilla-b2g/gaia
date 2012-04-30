
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

/* === Debug Grid === */
var GridView = {
  get grid() {
    return document.getElementById('debug-grid');
  },

  get visible() {
    return this.grid && this.grid.style.display === 'block';
  },

  hide: function gv_hide() {
    if (this.grid)
      this.grid.style.display = 'none';
  },

  show: function gv_show() {
    var grid = this.grid;
    if (!grid) {
      var style = '#debug-grid {' +
                  '  position: absolute;' +
                  '  top: 0;' +
                  '  left: 0;' +
                  '  display: block;' +
                  '  width: 100%;' +
                  '  height: 100%;' +
                  '  background: url(images/grid.png);' +
                  '  z-index: 30000;' +
                  '  opacity: 0.2;' +
                  '  pointer-events: none;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      grid = document.createElement('div');
      grid.id = 'debug-grid';

      document.body.appendChild(grid);
    }

    grid.style.display = 'block';
  },

  toggle: function gv_toggle() {
    this.visible ? this.hide() : this.show();
  }
};

SettingsListener.observe('debug.grid.enabled', false, function(value) {
  !!value ? GridView.show() : GridView.hide();
});

/* === Lockscreen === */
SettingsListener.observe('lockscreen.enabled', true, function(value) {
  localStorage['lockscreen'] = value;
});

/* === Language === */
SettingsListener.observe('language.current', 'en-US', function(value) {
  updateConnection();
});

/* === Invert Display === */
SettingsListener.observe('accessibility.invert', false, function(value) {
  var screen = document.getElementById('screen');
  if (value)
    screen.classList.add('accessibility-invert');
  else
    screen.classList.remove('accessibility-invert');
});

/* === Screen brightness === */
SettingsListener.observe('screen.brightness', 0.5, function(value) {
  ScreenManager.preferredBrightness =
    navigator.mozPower.screenBrightness = parseFloat(value);
});

