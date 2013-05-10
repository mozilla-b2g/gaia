'use strict';

var SystemBanner = {
  banner: document.getElementById('system-banner'),

  // clicked callback called. Bypass dismiss.
  _clicked: false,
  _clickCallback: null,

  // Shows a banner with a given message.
  // Optionally shows a button with a given label/callback/dismiss.
  // 'dismiss' is called when the banner is dismissed and button
  // has not been clicked. It is optional.
  // buttonParams = { label: ..., callback: ..., dismiss: ... }
  show: function sb_show(message, buttonParams) {
    var banner = this.banner;
    banner.firstElementChild.textContent = message;

    var button = banner.querySelector('button');
    if (buttonParams) {
      banner.dataset.button = true;
      button.textContent = buttonParams.label;
      var self = this;
      self._clickCallback = function() {
        self._clicked = true;
        buttonParams.callback();
      };
      button.addEventListener('click', self._clickCallback);
    }

    banner.addEventListener('animationend', function animationend() {
      banner.removeEventListener('animationend', animationend);
      banner.classList.remove('visible');

      if (buttonParams) {
        if (buttonParams.dismiss && !this._clicked) {
          buttonParams.dismiss();
        }
        banner.dataset.button = false;
        button.removeEventListener('click', this._clickCallback);
        button.classList.remove('visible');
      }
    });

    banner.classList.add('visible');
  }
};
