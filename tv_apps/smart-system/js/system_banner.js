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
     * Generates and returns the banner if it does not exist
     * @memberof SystemBanner.prototype
     * @type {Function}
     */
    get banner() {
      this._banner = this._banner ||
        document.getElementById('system-banner-container');
      return this._banner;
    },

    /**
     * Shows a banner with a given message.
     * @memberof SystemBanner.prototype
     * @param {Object} message The message to display
     * - @param {String|Object} message.title The title of the banner.
     *  if message.title is an object:
     *  - @param {String} message.title.id The title L10n id of the banner.
     *  - @param {String} message.title.args The title L10n args of the banner.
     * - @param {String|Object} message.text The text of the banner.
     *  if message.text is an object:
     *  - @param {String} message.text.id The text L10n id of the banner.
     *  - @param {String} message.text.args The text L10n args of the banner.
     * @param {String} message.icon The icon url of the banner.
     */
    show: function(msg) {
      var banner = this.banner;
      var title = banner.firstElementChild.children[0];
      var text = banner.firstElementChild.children[1];

      banner.style.backgroundImage = msg.icon ? 'url("' + msg.icon + '")': null;
      if (msg.title && msg.title.id) {
        navigator.mozL10n.setAttributes(
          title,
          msg.title.id,
          msg.title.args
        );
      } else {
        title.removeAttribute('data-l10n-id');
        title.removeAttribute('data-l10n-args');
        title.textContent = msg.title || '';
      }

      if (msg.text && msg.text.id) {
        navigator.mozL10n.setAttributes(
          text,
          msg.text.id,
          msg.text.args
        );
      } else {
        text.removeAttribute('data-l10n-id');
        text.removeAttribute('data-l10n-args');
        text.textContent = msg.text || '';
      }

      banner.classList[msg.title ? 'add' : 'remove']('has-title');

      banner.addEventListener('hidden', function onHidden() {
        banner.removeEventListener('hidden', onHidden);
        banner.classList.add('hidden');
      });

      banner.classList.remove('hidden');
      banner.show({ animation: 'bouncing' });
    }
  };

  exports.SystemBanner = SystemBanner;

}(window));
