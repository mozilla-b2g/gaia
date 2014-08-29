/*global define*/
define(function(require) {

'use strict';

var templateNode = require('tmpl!./settings_signature.html'),
    backFormNode = require('tmpl!./sig/save_signature.html'),
    editorMixin = require('./editor_mixins'),
    mix = require('mix'),
    common = require('mail_common'),
    Cards = common.Cards,
    trailingRegExp = /\s+$/;

function SettingsSignatureCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.identity = this.account.identities[0];
  this.signatureNode = domNode
    .getElementsByClassName('tng-signature-text')[0];

  this._bindEditor(this.signatureNode);

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-signature-done')[0]
    .addEventListener('click', this.onClickDone.bind(this), false);

  this.populateEditor(this.identity.signature || '');
}

SettingsSignatureCard.prototype = {

  // Removes any trailing whitespace, since it is just noise, and it also sets
  // up the wrong expectation when the cursor is auto-focused at the end of the
  // content -- it will sometimes show up on the far right of the text screen
  // because of phantom \n (that are <br>s in the HTML).
  getTextFromEditor: function() {
    var text = this.fromEditor().replace(trailingRegExp, '');
    return text;
  },

  goBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onBack: function() {
    var signature = this.getTextFromEditor();
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
    var signature = this.getTextFromEditor();

    // Only push the signature if it was changed
    if (signature !== this.identity.signature) {
      this.identity.modifyIdentity({ signature: signature });
    }

    this.onBack();
  },

  onCardVisible: function() {
    // Need to wait until the card is shown and animation is done before
    // focusing input in the editable area.

    // Clear any existing selections
    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
    }

    // If there is content, set the cursor at the
    // end of it.
    var node = this.signatureNode.lastChild;
    if (node) {
      var range = document.createRange();

      range.setStartAfter(node);
      range.setEndAfter(node);
      selection.addRange(range);
    }

    // The selection sets up where the cursor will show, this ties it all
    // together and brings up the keyboard.
    this.signatureNode.focus();
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
