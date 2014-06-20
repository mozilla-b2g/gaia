(function(exports) {
  'use strict';
  /**
  Generic dialog helper this _depends_ on <gaia-confirm> but is not required
  to be loaded as part of the main gaia-confirm script.
  */
  function ConfirmDialogHelper(config) {
    this.config = config;
  }

  ConfirmDialogHelper.prototype = {
    show: function(parent) {
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

      title.textContent = config.title;
      body.textContent = config.body;
      confirm.textContent = config.confirm.title;

      if (config.cancel) {
        cancel.textContent = config.cancel.title;
      }

      if (config.confirm.type) {
        confirm.classList.add(config.confirm.type);
      }
      parent.appendChild(element);
    },

    destroy: function() {
      if (!this.element) {
        return;
      }

      // Ensure cleanup of our hacks!
      window.removeEventListener('hashchange', this);

      this.element.parentNode.removeChild(this.element);
      this.element = null;
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
