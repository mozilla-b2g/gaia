(function(exports) {
  'use strict';
  /*
   Centralized event handling for various
   data-actions url, email, phone in a message
  */
  var inProgress = false;

  var LinkActionHandler = {
    onClick: function lah_onClick(event) {
      var dataset = event.target.dataset;
      var action = dataset.action;
      var type;

      if (!action) {
        return;
      }

      // To avoid activity pile up, return immediately if the
      // last activity is still in progress.
      if (inProgress) {
        return;
      }

      inProgress = true;

      type = action.replace('-link', '');

      // Use `LinkActionHandler.reset` (this.reset) as BOTH the
      // success and error callback. This ensure that any
      // activities will be freed regardless of their
      // resulting state.

      ActivityPicker[type](
        dataset[type], this.reset, this.reset
      );
    },

    onContextMenu: function lah_onContextMenu(event) {
      event.preventDefault();
      event.stopPropagation();

      var dataset = event.target.dataset;
      var action = dataset.action;
      var number;

      if (!action) {
        return;
      }

      if (action === 'email-link') {
        ThreadUI.activateContact({
          email: dataset.email,
          inMessage: true
        });
      }

      if (action === 'dial-link') {
        number = dataset.dial;

        Contacts.findByPhoneNumber(number, function(contacts) {
          var isContact = contacts && contacts.length > 0;
          var details = Utils.getContactDetails(number, contacts);

          ThreadUI.activateContact({
            name: details.title || details.name,
            number: number,
            isContact: isContact,
            inMessage: true
          });
        });
      }

      if (action === 'url-link') {
        // 'url-link' currently doesn't offer any special context
        // menu options. Delegate directly to the click event handler.
        this.onClick(event);
      }
    },

    reset: function lah_reset() {
      inProgress = false;
    }
  };

  exports.LinkActionHandler = LinkActionHandler;
}(this));
