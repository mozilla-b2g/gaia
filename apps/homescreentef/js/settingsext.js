
SettingsListener.getPropertyValue = function(name, callback) {
  var settings = window.navigator.mozSettings;
  if (!settings) {
    window.setTimeout(function() { callback(''); });
    return;
  }

  var req = settings.getLock().get(name);
  req.addEventListener('success', (function onsuccess() {
    callback(req.result[name]);
  }));
};

SettingsListener.onPropModified = function(name, callback) {
  this._callbacks[name] = callback;
};
