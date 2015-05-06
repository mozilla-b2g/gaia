define(function(require) {
  'use strict';

  var DsdsSettings = require('dsds_settings');
  var DialogService = require('modules/dialog_service');
  var FdnContext = require('modules/fdn_context');
  var SettingsPanel = require('modules/settings_panel');

  return function ctor_settings_panel() {
    return SettingsPanel({
      _currentContact: null,

      onInit: function(panel) {
        this._elements = {};
        this._elements.fdnContactButton = panel.querySelector('.fdnContact');
        this._elements.fdnActionMenu =
          panel.querySelector('.call-fdnList-action');
        this._elements.fdnActionMenuName =
          panel.querySelector('.fdnAction-name');
        this._elements.fdnActionMenuNumber =
          panel.querySelector('.fdnAction-number');
        this._elements.fdnActionMenuCall =
          panel.querySelector('.fdnAction-call');
        this._elements.fdnActionMenuEdit =
          panel.querySelector('.fdnAction-edit');
        this._elements.fdnActionMenuRemove =
          panel.querySelector('.fdnAction-delete');
        this._elements.fdnActionMenuCancel =
          panel.querySelector('.fdnAction-cancel');
        this._elements.contactsContainer =
          panel.querySelector('.fdn-contactsContainer');

        this._bindEvents();
      },

      onBeforeShow: function() {
        this._renderAuthorizedNumbers();
      },

      _bindEvents: function() {
        // add FDN contact
        this._elements.fdnContactButton.onclick = () => {
          DialogService.show('call-fdnList-add', {
            mode: 'add'
          }).then((result) => {
            var type = result.type;
            var value = result.value;
            if (type === 'submit') {
              this._updateContact('add', {
                name: value.name,
                number: value.number
              });
            }
          });
        };

        // edit FDN contact
        this._elements.fdnActionMenuEdit.onclick = () => {
          // hide action menu first
          this._hideActionMenu();

          // then show dialog
          DialogService.show('call-fdnList-add', {
            name: this._currentContact.name,
            number: this._currentContact.number,
            mode: 'edit'
          }).then((result) => {
            var type = result.type;
            var value = result.value;
            if (type === 'submit') {
              this._updateContact('edit', {
                name: value.name,
                number: value.number
              });
            }
          });
        };

        // remove FDN contact
        this._elements.fdnActionMenuRemove.onclick = () => {
          this._hideActionMenu();
          this._updateContact('remove');
        };

        // call that fdn
        this._elements.fdnActionMenuCall.onclick = () => {
          var activity = new window.MozActivity({
            name: 'dial',
            data: {
              type: 'webtelephony/number',
              number: this._currentContact.number
            }
          });

          activity.onerror = () => {
            console.error('we are not able to call mozActivity to dialer with' +
              ' number ' + this._currentContact.number);
          };
        };

        this._elements.fdnActionMenuCancel.onclick =
          this._hideActionMenu.bind(this);
      },

      /**
       * we will render all registered FDN numbers on screen.
       *
       * @type {Function}
       * @return {Promise}
       */
      _renderAuthorizedNumbers: function() {
        this._elements.contactsContainer.innerHTML = '';
        var cardIndex = DsdsSettings.getIccCardIndexForCallSettings();
        return FdnContext.getContacts(cardIndex).then((contacts) => {
          for (var i = 0, l = contacts.length; i < l; i++) {
            var li = this._renderFdnContact(contacts[i]);
            this._elements.contactsContainer.appendChild(li);
          }
        });
      },

      /**
       * render needed UI for each contact item.
       *
       * @type {Function}
       * @param {Object} contact
       */
      _renderFdnContact: function(contact) {
        var li = document.createElement('li');
        var nameContainer = document.createElement('span');
        var numberContainer = document.createElement('small');

        nameContainer.textContent = contact.name;
        numberContainer.textContent = contact.number;
        li.appendChild(numberContainer);
        li.appendChild(nameContainer);

        li.onclick = () => {
          this._showActionMenu(contact);
        };

        return li;
      },

      /**
       * show specific contact on the menu.
       *
       * @type {Function}
       * @param {Object} contact
       */
      _showActionMenu: function(contact) {
        this._currentContact = contact;
        this._elements.fdnActionMenuName.textContent = contact.name;
        this._elements.fdnActionMenuNumber.textContent = contact.number;
        this._elements.fdnActionMenu.hidden = false;
      },

      /**
       * hide the whole action menu.
       *
       * @type {Function}
       */
      _hideActionMenu: function() {
        this._elements.fdnActionMenu.hidden = true;
      },

      /**
       * update information on each contact item based on passed in parameters.
       *
       * @type {Function}
       * @param {String} action
       * @param {Object} options
       * @return {Promise}
       */
      _updateContact: function(action, options) {
        // `action' is either `add', `edit' or `remove': these three actions all
        // rely on the same mozIccManager.updateContact() method.
        options = options || {};
        var cardIndex = DsdsSettings.getIccCardIndexForCallSettings();
        var name = options.name;
        var number = options.number;

        var contact = FdnContext.createAction(action, {
          cardIndex: cardIndex,
          contact: {
            id: this._currentContact && this._currentContact.id,
            name: name,
            number: number
          }
        });

        return DialogService.show('simpin-dialog', {
          method: 'get_pin2',
          cardIndex: cardIndex,
          pinOptions: {
            fdnContact: contact
          }
        }).then((result) => {
          var type = result.type;
          if (type === 'submit') {
            this._renderAuthorizedNumbers();
          }
        });
      }
    });
  };
});
