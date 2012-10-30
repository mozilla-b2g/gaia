'use strict';

var SystemBanner = {
  banner: document.getElementById('system-banner'),

  // Shows a banner with a given message.
  // Optionally shows a button with a given label/callback.
  // buttonParams = { label: ..., callback: ... }
  show: function sb_show(message, buttonParams) {
    var banner = this.banner;
    banner.firstElementChild.textContent = message;

    var button = banner.querySelector('button');
    if (buttonParams) {
      banner.dataset.button = true;
      button.textContent = buttonParams.label;
      button.addEventListener('click', buttonParams.callback);
    }

    banner.addEventListener('animationend', function animationend() {
      banner.removeEventListener('animationend', animationend);
      banner.classList.remove('visible');

      if (buttonParams) {
        banner.dataset.button = false;
        button.removeEventListener('click', buttonParams.callback);
        button.classList.remove('visible');
      }
    });

    banner.classList.add('visible');
  }
};
