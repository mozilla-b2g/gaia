'use strict';

var SystemBanner = {
  banner: document.getElementById('system-banner'),

  show: function sb_show(message) {
    var banner = this.banner;
    banner.firstElementChild.textContent = message;

    banner.addEventListener('animationend', function animationend() {
      banner.removeEventListener('animationend', animationend);
      banner.classList.remove('visible');
    });

    banner.classList.add('visible');
  }
};
