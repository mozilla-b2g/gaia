'use strict';
define(function() {
  /**
   * Intercept a one-time volume button press, so that you can perform a
   * one-time action when the user taps a volume button. This is needed
   * until the tree of bugs surrounding https://bugzil.la/913048
   * (dispatching hardware button press events to apps) are fixed.
   *
   * While we cannot actually prevent the system from changing the
   * volume by one click when tapping a hardware button, we _can_ "undo"
   * the change by immediately setting the volume back to where it was
   * before the button press. The only unfortunate side effect of this
   * is that the user will still see the volume-changing overlay
   * briefly; it is my opinion (:mcav) that, at least in the Clock app,
   * it's better to show that misleading UI than to ignore volume
   * presses entirely when the user wants to dismiss a ringing alarm.
   *
   * As currently written, this class only fires `callback` once -- it
   * is intended to be used to dismiss a dialog, not to handle
   * repeated button presses.
   */
  function VolumeInterceptor(callback) {
    if (!navigator.mozSettings) { return; }

    this.callback = callback;
    this.monitorsReady = {};
    this.onVolumeChange = this.onVolumeChange.bind(this);

    // Audio could be playing out of any of these channels; listen to all.
    this.beginMonitoringChannel('audio.volume.content');
    this.beginMonitoringChannel('audio.volume.alarm');
    this.beginMonitoringChannel('audio.volume.notification');
  }

  VolumeInterceptor.prototype = {
    beginMonitoringChannel: function(setting) {
      this.monitorsReady[setting] = new Promise((resolve, reject) => {
        navigator.mozSettings.addObserver(setting, this.onVolumeChange);
        var req = navigator.mozSettings.createLock().get(setting);
        req.onsuccess = () => {
          resolve(req.result[setting]);
        };
        req.onerror = reject;
      });
    },

    stopMonitoring: function() {
      for (var setting in this.monitorsReady) {
        navigator.mozSettings.removeObserver(setting, this.onVolumeChange);
      }
    },

    onVolumeChange: function(evt) {
      var setting = evt.settingName;
      this.stopMonitoring(); // We only need to handle one notification.
      // We must block until we receive previousValue, otherwise we
      // can't undo the volume change.
      this.monitorsReady[setting].then((previousValue) => {
        var opts = {};
        opts[setting] = previousValue;
        var req = navigator.mozSettings.createLock().set(opts);
        req.onsuccess = req.onerror = () => {
          this.callback();
        };
      });
    }
  };

  return VolumeInterceptor;
});
