/**
 * Asks the user to manually configure their account.
 */
/*jshint nonew: false */
/*global MozActivity */
'use strict';
define(function(require) {

var cards = require('cards'),
    ConfirmDialog = require('confirm_dialog'),
    FormNavigation = require('form_navigation'),
    plainSocketWarningNode = require('tmpl!./tng/plain_socket_warning.html');

return [
  require('./base_card')(require('template!./setup_manual_config.html')),
  require('./setup_account_error_mixin'),
  {
    onArgs: function(args) {
      this.formItems = {
        common: {
          displayName: this._fromClass('sup-info-name'),
          emailAddress: this._fromClass('sup-info-email'),
          password: this._fromClass('sup-info-password'),
          passwordWrapper: this._fromClass('sup-manual-password-wrapper')
        },
        composite: {
          hostname: this._fromClass('sup-manual-composite-hostname'),
          port: this._fromClass('sup-manual-composite-port'),
          socket: this._fromClass('sup-manual-composite-socket'),
          username: this._fromClass('sup-manual-composite-username'),
          password: this._fromClass('sup-manual-composite-password')
        },
        smtp: {
          hostname: this._fromClass('sup-manual-smtp-hostname'),
          port: this._fromClass('sup-manual-smtp-port'),
          socket: this._fromClass('sup-manual-smtp-socket'),
          username: this._fromClass('sup-manual-smtp-username'),
          password: this._fromClass('sup-manual-smtp-password')

        },
        activeSync: {
          hostname: this._fromClass('sup-manual-activesync-hostname'),
          username: this._fromClass('sup-manual-activesync-username')
        }
      };

      var password = password || '';

      var common = this.formItems.common;
      common.displayName.value = args.displayName;
      common.emailAddress.value = args.emailAddress;
      common.password.value = password;

      var composite = this.formItems.composite;
      composite.username.value = args.emailAddress;
      composite.password.value = password;


      var smtp = this.formItems.smtp;
      smtp.username.value = args.emailAddress;
      smtp.password.value = password;

      this.changeIfSame(common.emailAddress,
                        [composite.username,
                         smtp.username]);
      this.changeIfSame(composite.username,
                        [smtp.username]);
      this.changeIfSame(composite.password,
                        [smtp.password,
                         common.password]);

      for (var type in this.formItems) {
        for (var field in this.formItems[type]) {
          if (this.formItems[type][field].tagName === 'INPUT') {
            this.formItems[type][field].addEventListener(
              'input', this.onInfoInput.bind(this));
          }
        }
      }

      this.requireFields('composite', true);
      this.requireFields('smtp', true);
      this.requireFields('activeSync', false);

      composite.socket.addEventListener('change',
                                       this.onChangeCompositeSocket.bind(this));
      smtp.socket.addEventListener('change',
                                   this.onChangeSmtpSocket.bind(this));

      this.onChangeAccountType({ target: this.accountTypeNode });

      this._formNavigation = new FormNavigation({
        formElem: this.formNode,
        onLast: this.onNext.bind(this)
      });
    },

    _fromClass: function(className) {
      return this.getElementsByClassName(className)[0];
    },
    onBack: function(event) {
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    onNext: function(event) {
      event.preventDefault(); // Prevent FormNavigation from taking over.
      var config = { type: this.accountTypeNode.value };

      if (config.type === 'imap+smtp' || config.type === 'pop3+smtp') {
        config.incoming = {
          hostname: this.formItems.composite.hostname.value,
          port: this.formItems.composite.port.value,
          socketType: this.formItems.composite.socket.value,
          username: this.formItems.composite.username.value,
          password: this.formItems.composite.password.value,
          authentication: 'password-cleartext'
        };
        config.outgoing = {
          hostname: this.formItems.smtp.hostname.value,
          port: this.formItems.smtp.port.value,
          socketType: this.formItems.smtp.socket.value,
          username: this.formItems.smtp.username.value,
          password: this.formItems.smtp.password.value,
          authentication: 'password-cleartext'
        };
      }
      else { // config.type === 'activesync'
        config.incoming = {
          server: 'https://' + this.formItems.activeSync.hostname.value,
          username: this.formItems.activeSync.username.value
        };
      }

      this.pushSetupCard(config);
    },

    pushSetupCard: function(config) {
      // For composite accounts where they've elected to have separate
      // passwords, use the composite password field. For everything
      // else, there's MasterCard. Uh, I mean, the common password.
      var password;
      if (this.accountTypeNode.value === 'activesync') {
        password = this.formItems.common.password.value;
      } else {
        password = this.formItems.composite.password.value;
      }
      // The progress card is the dude that actually tries to create the
      // account.
      cards.pushCard(
        'setup_progress', 'animate',
        {
          displayName: this.formItems.common.displayName.value,
          emailAddress: this.formItems.common.emailAddress.value,
          password: password,
          outgoingPassword: config.outgoing && config.outgoing.password,

          configInfo: config,
          callingCard: this
        },
        'right');
    },

    onInfoInput: function(ignoredEvent) {
      this.nextButton.disabled = !this.formNode.checkValidity();
    },

    /**
     * When sourceField changes, change every field in destFields to
     * match, if and only if destField previously matched sourceField.
     */
    changeIfSame: function(sourceField, destFields) {
      sourceField._previousValue = sourceField.value;
      sourceField.addEventListener('input', function(e) {
        for (var i = 0; i < destFields.length; i++) {
          var destField = destFields[i];
          if (destField.value === e.target._previousValue) {
            destField.value = destField._previousValue = e.target.value;
          }
        }
        sourceField._previousValue = e.target.value;
        this.onInfoInput(); // run validation
      }.bind(this));
    },

    onChangeAccountType: function(event) {
      var isComposite = (event.target.value === 'imap+smtp' ||
                         event.target.value === 'pop3+smtp');
      var isImap = event.target.value === 'imap+smtp';

      if (isComposite) {
        this.compositeSection.classList.remove('collapsed');
        this.activeSyncSection.classList.add('collapsed');
        this.manualImapTitle.classList.toggle('collapsed', !isImap);
        this.manualPop3Title.classList.toggle('collapsed', isImap);
      }
      else {
        this.compositeSection.classList.add('collapsed');
        this.activeSyncSection.classList.remove('collapsed');
      }

      this.formItems.common.passwordWrapper.classList.toggle(
        'collapsed', isComposite);
      this.requireFields('composite', isComposite);
      this.requireFields('smtp', isComposite);
      this.requireFields('activeSync', !isComposite);
      this.onChangeCompositeSocket({target: this.formItems.composite.socket});
    },

    // If the user selects a different socket type, autofill the most likely
    // port.
    onChangeCompositeSocket: function(event) {
      var isImap = this.accountTypeNode.value === 'imap+smtp';
      var SSL_VALUE = (isImap ? '993' : '995');
      var STARTTLS_VALUE = (isImap ? '143' : '110');

      var socketType = event.target.value;
      if (socketType === 'PLAIN') {
        this.showPlainSocketWarning();
      }

      var portField = this.formItems.composite.port;
      if (socketType === 'SSL') {
        portField.value = SSL_VALUE;
      } else if (socketType === 'STARTTLS' || socketType === 'PLAIN') {
        portField.value = STARTTLS_VALUE;
      }
    },

    onChangeSmtpSocket: function(event) {
      const SSL_VALUE = '465';
      const STARTTLS_VALUE = '587';
      const PLAIN_VALUE = '25';
      var socketType = event.target.value;
      var portField = this.formItems.smtp.port;

      if (socketType == 'PLAIN') {
        this.showPlainSocketWarning();
      }

      // Switch portField values to match defaults for the socketType, but only
      // if the existing value for portField is one of the other defaults, and
      // not a user-supplied value.
      if (socketType === 'SSL' && (portField.value === STARTTLS_VALUE ||
                                   portField.value === PLAIN_VALUE)) {
        portField.value = SSL_VALUE;
      } else if (socketType == 'STARTTLS' && (portField.value == SSL_VALUE ||
                                              portField.value == PLAIN_VALUE)) {
        portField.value = STARTTLS_VALUE;
      } else if (socketType == 'PLAIN' && (portField.value == SSL_VALUE ||
                                           portField.value == STARTTLS_VALUE)) {
        portField.value = PLAIN_VALUE;
      }
    },

    requireFields: function(type, required) {
      for (var field in this.formItems[type]) {
        var item = this.formItems[type][field];
        if (!item.hasAttribute('data-maybe-required')) {
          continue;
        }

        if (required) {
          item.setAttribute('required', '');
        } else {
          item.removeAttribute('required');
        }
      }
    },

    showPlainSocketWarning: function() {
      var dialog = plainSocketWarningNode.cloneNode(true);

      // Capture taps to Learn More to open an activity and to also prevent the
      // confirmation dialog from closing. A Learn More button is used instead
      // of a hyperlink so that more text can be visible in the dialog.
      var learnMoreNode = dialog.querySelector('.tng-plain-socket-learn-more');
      learnMoreNode.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        new MozActivity({
          name: 'view',
          data: {
            type: 'url',
            url: learnMoreNode.dataset.href
          }
        });
      });

      ConfirmDialog.show(dialog, {
        // ok
        id: 'tng-plain-socket-warning-ok',
        // There is nothing to do.
        handler: function() {}
      });
    },

    die: function() {
      this._formNavigation = null;
    }
  }
];
});
