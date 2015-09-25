'use strict';
/* global ComponentUtils, MozActivity */

/**
 * The gaia-confirm component displays a dialog in which the user has a
 * choice to confirm or cancel the action. It may be displayed along with a
 * title, description, and image. Buttons may also be configured.
 * @requires GaiaButtons
 */
window.GaiaLowstorageDialog = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaLowstorageDialogBaseurl ||
    '/shared/elements/gaia_lowstorage_dialog/';

  function learnmore() {
    var activity = new MozActivity({
      name: 'configure',
      data: {
        section: 'applicationStorage'
      }
    });

    return Promise.resolve(activity);
  }

  /**
   * Localize the component manually as l10n attributes are not supported
   * within the shadow dom. See also: bug 1026236.
   */
  proto._localizeShadowDom = function() {
    navigator.mozL10n.translateFragment(this.shadowRoot);
  };

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    var node = document.importNode(template.content, true);
    shadow.appendChild(node);
    ComponentUtils.style.call(this, baseurl);

    navigator.mozL10n.ready(this._localizeShadowDom.bind(this));

    var learnmoreLink = shadow.querySelector('.learnmore-button');
    learnmoreLink.addEventListener('click', learnmore);

    var confirm = this.confirm = shadow.querySelector('gaia-confirm');
    confirm.addEventListener('confirm', () => {
      this.dispatchEvent(new CustomEvent('confirm'));
    });
    this._mirrorHiddenAttribute();
  };

  proto._mirrorHiddenAttribute = function() {
    if (this.hasAttribute('hidden')) {
      this.confirm.setAttribute('hidden', '');
    } else {
      this.confirm.removeAttribute('hidden');
    }
  };

  proto.attributeChangedCallback = function(name, _, newVal) {
    if (name !== 'hidden') {
      return;
    }

    this._mirrorHiddenAttribute();
  };

  var template = document.createElement('template');
  template.innerHTML = `<gaia-confirm>
    <h1 data-l10n-id="lowstorage-dialog-title"></h1>
    <p>
      <strong data-l10n-id='lowstorage-explanation'></strong>
      <br/>
      <strong><content/></strong>
    </p>
    <p data-l10n-id="lowstorage-dialog-generic-text"></p>
    <p>
      <button type="button"
              class="button-link-like learnmore-button"
              data-l10n-id="lowstorage-dialog-learnmore"></button>
    </p>
    <gaia-buttons skin="dark">
      <button class="confirm recommend"
              data-l10n-id="lowstorage-dialog-ok"
              type="button"></button>
    </gaia-buttons>
  </gaia-confirm>`;

  // Register and return the constructor
  return document.registerElement(
    'gaia-lowstorage-dialog', { prototype: proto }
  );

})(window);
