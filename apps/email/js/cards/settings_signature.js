/*global define*/
define(function(require) {

'use strict';

var templateNode = require('tmpl!./settings_signature.html'),
    backFormNode = require('tmpl!./sig/save_signature.html'),
    editorMixin = require('./editor_mixins'),
    mix = require('mix'),
    common = require('mail_common'),
    Cards = common.Cards;

function SettingsSignatureCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.identity = this.account.identities[0];
  this.signatureNode = domNode
    .getElementsByClassName('tng-signature-input')[0];

  this._bindEditor(this.signatureNode);

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-signature-done')[0]
    .addEventListener('click', this.onClickDone.bind(this), false);

  this.populateEditor(this.identity.signature || '');

}

SettingsSignatureCard.prototype = {


  goBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onBack: function() {
    var signature = this.fromEditor();
    if (signature === this.identity.signature) {
      this.goBack();
      return;
    }
    var menu = backFormNode.cloneNode(true);
    this._savePromptMenu = menu;
    Cards.setStatusColor(menu);
    document.body.appendChild(menu);

    var formSubmit = (function(evt) {
      Cards.setStatusColor();
      document.body.removeChild(menu);
      this._savePromptMenu = null;

      switch (evt.explicitOriginalTarget.id) {
        case 'sig-save':
          this.identity.modifyIdentity({ signature: signature });
          this.goBack();
          break;
        case 'sig-discard':
          this.goBack();
          break;
        case 'sig-cancel':
          break;
      }
      return false;
    }).bind(this);
    menu.addEventListener('submit', formSubmit);
  },

  onClickDone: function() {
    var signature = this.fromEditor();

    // Only push the signature if it was changed
    if (signature !== this.identity.signature) {
      this.identity.modifyIdentity({ signature: signature });
    }

    this.onBack();
  },


  die: function() {
  },

};

mix(SettingsSignatureCard.prototype, editorMixin);

Cards.defineCardWithDefaultMode(
    'settings_signature',
    { tray: false },
    SettingsSignatureCard,
    templateNode
);

return SettingsSignatureCard;
});
