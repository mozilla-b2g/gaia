'use strict';

(function(exports) {

 /**
   * Banner displays a type of notification to the user in certain cases.
   * @class Banner
   */

  var Banner = {

    _banner: null,

    get banner() {
      if (!this._banner) {
        this._banner = document.createElement('section');
        this._banner.className = 'banner generic-dialog';
        this._banner.setAttribute('role', 'dialog');
        this._banner.innerHTML = '<div><p></p></div>';
        document.body.appendChild(this._banner);
      }

      return this._banner;
    },

    show: function(message) {
      var banner = this.banner;
      document.l10n.setAttributes(
        banner.firstElementChild.firstElementChild,
        message.id,
        message.args
      );

      banner.addEventListener('animationend', function animationend() {
        banner.removeEventListener('animationend', animationend);
        banner.classList.remove('visible');
      }.bind(this));
      banner.classList.add('visible');
    }
  };

  exports.Banner = Banner;

}(window));
