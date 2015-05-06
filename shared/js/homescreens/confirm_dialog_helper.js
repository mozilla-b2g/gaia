/* global LazyLoader */

(function(exports) {
  'use strict';

  var resources = ['/shared/js/component_utils.js',
                   '/shared/elements/gaia_buttons/script.js',
                   '/shared/elements/gaia_confirm/script.js',
                   '/shared/elements/gaia_menu/script.js'];
  /**
  Generic dialog helper this _depends_ on <gaia-confirm> but is not required
  to be loaded as part of the main gaia-confirm script.
  */
  function ConfirmDialogHelper(config) {
    this.config = config;
  }

  ConfirmDialogHelper.prototype = {
    show: function(parent) {
      LazyLoader.load(resources, this._show.bind(this, parent));
    },

    _show: function(parent) {
      var config = this.config;
      var wrapper = document.createElement('div');

      // only include a cancel button if the config was given...
      var cancelButton = config.cancel ?
        '<button class="cancel" type="button"></button>' :
        '';

      wrapper.innerHTML =
        '<gaia-confirm>' +
          '<h1></h1>' +
          '<p></p>' +
          '<gaia-buttons skin="dark">' +
            cancelButton +
            '<button class="confirm" type="button"></button>' +
          '</gaia-buttons>' +
        '</gaia-confirm>';

      var element = wrapper.firstElementChild;

      this.element = element;

      element.dataset.type = config.type;
      element.addEventListener('confirm', this);
      element.addEventListener('cancel', this);

      // XXX: Primarily here for pressing the home screen button.
      // The home button triggers a hashchange of the homescreen.
      window.addEventListener('hashchange', this);
      // TODO: Add visibility change handling...

      var title = element.querySelector('h1');
      var body = element.querySelector('p');
      var cancel = element.querySelector('.cancel');
      var confirm = element.querySelector('.confirm');

      var setL10nAttributes = function (element, options){
        if ('string' === typeof options) {
          navigator.mozL10n.setAttributes(element, options);
        }

        if(options.id) {
          navigator.mozL10n.setAttributes(element, options.id, options.args);
        }
      };

      setL10nAttributes(title, config.title);
      setL10nAttributes(body, config.body);
      setL10nAttributes(confirm, config.confirm.title);

      if (config.cancel) {
        setL10nAttributes(cancel, config.cancel.title);
      }

      if (config.confirm.type) {
        confirm.classList.add(config.confirm.type);
      }

      document.activeElement.blur();
      element.setAttribute('hidden', '');
      parent.appendChild(element);

      // This nested requestAnimationFrame is to work around the coalescing
      // of the style changes associated with removing of the 'hidden'
      // attribute with the creation of the element.
      // For whatever reason, flushing the style with the usual trick of
      // accessing clientTop doesn't work, and a setTimeout requires an
      // unreasonably lengthy timeout (>50ms) to work, and that may not be
      // a reliable solution.
      // This work-around, though gross, appears to work consistently without
      // introducing too much lag or extra work.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          element.removeAttribute('hidden');
          window.dispatchEvent(new CustomEvent('gaia-confirm-open'));
        });
      });
    },

    destroy: function() {
      if (!this.element) {
        return;
      }

      // Ensure cleanup of our hacks!
      window.removeEventListener('hashchange', this);

      this.element.addEventListener('transitionend',
        function removeAfterHide(e) {
          if (e.target !== this.element) {
            return;
          }

          this.element.parentNode.removeChild(this.element);
          this.element = null;
          window.dispatchEvent(new CustomEvent('gaia-confirm-close'));
        }.bind(this));

      this.element.setAttribute('hidden', '');
    },

    handleEvent: function(e) {
      // Ensure we hide the dialog in the face of other errors.
      this.destroy();

      switch (e.type) {
        case 'hashchange':
          // Hashchange is only here to trigger this to call destroy.
          break;
        case 'confirm':
          var confirm = this.config.confirm.cb;
          confirm && confirm();
          break;
        case 'cancel':
          var cancel = this.config.cancel.cb;
          cancel && cancel();
          break;
      }
    }
  };

  // This name is intentionally verbose.
  window.ConfirmDialogHelper = ConfirmDialogHelper;
}(window));
