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
      var options;

      // Return if there is an active MozActivity.
      if (inProgress) {
        return;
      }

      if (action) {
        switch (action) {
          case 'url-link':
            options = {
              name: 'view',
              data: {
                type: 'url',
                url: dataset.url
              }
            };
            inProgress = true;
            break;
          case 'email-link':
            options = {
              name: 'new',
              data: {
                type: 'mail',
                URI: 'mailto:' + dataset.email
              }
            };
            inProgress = true;
            break;
          case 'phone-link':
            options = {
              name: 'dial',
              data: {
                type: 'webtelephony/number',
                number: dataset.phonenumber
              }
            };
            inProgress = true;
            break;
        }
        if (options && MozActivity) {
          try {
            var activity = new MozActivity(options);
            activity.onsuccess = activity.onerror = this.reset;
          }
          catch (e) {
            console.log('WebActivities unavailable? : ' + e);
          }
        }
      }
    },

    onContextMenu: function lah_onContextMenu(event) {
      event.preventDefault();
      event.stopPropagation();

      var dataset = event.target.dataset;
      var action = dataset.action;
      var number;

      if (action) {
        if (action === 'phone-link') {
          number = dataset.phonenumber;

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

          return;
        }

        // Delegate to the common case (click) handler for
        // 'url-link' and 'email-link' actions
        this.onClick(event);
      }
    },

    reset: function lah_reset() {
      inProgress = false;
    }
  };

  exports.LinkActionHandler = LinkActionHandler;
}(this));
