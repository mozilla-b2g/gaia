'use strict';

(function(exports) {

 /**
   * SystemBanner displays a type of notification to the user in certain cases.
   * It is a type of temporary notification that does not live in the
   * notifications tray. Examples of the SystemBanner implementation include 
   * application installation, crash reporter, and low storage notices.
   * @class SystemBanner
   */
  function SystemBanner() {}

  SystemBanner.prototype = {

    /**
     * A reference to the SystemBanner element
     * @memberof SystemBanner.prototype
     * @type {Element}
     */
    _banner: null,

    /**
     * Set when the clicked callback called. Bypasses dismiss.
     * @memberof SystemBanner.prototype
     * @type {Boolean}
     */
    _clicked: false,

    /**
     * Callback when the user clicks on the system banner button.
     * @memberof SystemBanner.prototype
     * @type {Function}
     */
    _clickCallback: null,

    /**
     * Generates and returns the banner if it does not exist
     * @memberof SystemBanner.prototype
     * @type {Function}
     */
    get banner() {
      if (!this._banner) {
        this._banner = document.createElement('section');
        this._banner.className = 'banner generic-dialog';
        this._banner.setAttribute('role', 'dialog');
        this._banner.dataset.zIndexLevel = 'system-notification-banner';
        this._banner.dataset.button = 'false';
        document.getElementById('screen').appendChild(this._banner);
      }

      return this._banner;
    },

    /**
     * Shows a banner with a given message.
     * Optionally shows a button with a given label/callback/dismiss.
     * 'dismiss' is called when the banner is dismissed and button
     * has not been clicked. It is optional.
     * @memberof SystemBanner.prototype
     * @param {String|Array} message The message to display
     * @param {Object} buttonParams
     *   { label: l10nAttrs, callback: ..., dismiss: ... }
     */
    show: function(message, buttonParams) {
      var banner = this.banner;
      
      if (Array.isArray(message)) {
        message.forEach(function(chunk) {
          var span = document.createElement('span');
          setElementL10n(span, chunk);
          banner.appendChild(span);
        });
      } else {
        var span = document.createElement('span');
        setElementL10n(span, message);
        banner.appendChild(span);
      }

      if (buttonParams) {
        var button = document.createElement('button');
        banner.dataset.button = true;
        setElementL10n(button, buttonParams.label);
        this._clickCallback = function() {
          this._clicked = true;
          buttonParams.callback();
        }.bind(this);
        button.addEventListener('click', this._clickCallback);
        banner.appendChild(button);
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
          this.banner.parentNode.removeChild(this.banner);
        }
      }.bind(this));

      banner.classList.add('visible');
    }
  };

  function setElementL10n(element, l10nAttrs) {
    if (typeof(l10nAttrs) === 'string') {
      element.setAttribute('data-l10n-id', l10nAttrs);
    } else {
      navigator.mozL10n.setAttributes(
        element, l10nAttrs.id, l10nAttrs.args);
    }
  }

  exports.SystemBanner = SystemBanner;

}(window));
