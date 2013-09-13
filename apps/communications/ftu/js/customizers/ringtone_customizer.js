'use strict';

var ringtoneCustomizer = {
  init: function wc_init() {
    var self = this;
    window.addEventListener('customization', function updateRingtone(event) {
      if (event.detail.setting === 'ringtone') {
        window.removeEventListener('customization', updateRingtone);
        self.setRingtone(event.detail.value);
      }
    });
  },

  setRingtone: function wc_setWallpaper(url) {
    if (url) {
      navigator.mozSettings.createLock().set({
        'dialer.ringtone': url
      });
    }
  }

};
ringtoneCustomizer.init();
