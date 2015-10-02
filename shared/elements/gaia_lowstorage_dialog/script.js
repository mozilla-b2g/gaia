'use strict';
/* global ComponentUtils, MozActivity */

/**
 * Fired when the user pressed the OK button.
 * @event GaiaLowstorageDialog#confirm
 *
 * Fired when we fire the "Learn More" activity.
 * @event GaiaLowstorageDialog#learnmore
 */
/**
 * The gaia-lowstorage-dialog component displays a dialog in which the user has
 * information about the "low storage" device state.
 *
 * @requires GaiaButtons
 * @requires GaiaConfirm
 */
window.GaiaLowstorageDialog = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaLowstorageDialogBaseurl ||
    '/shared/elements/gaia_lowstorage_dialog/';

  /**
   * Localize the component manually as l10n attributes are not supported
   * within the shadow dom. See also: bug 1026236.
   */
  proto._localizeShadowDom = function() {
    navigator.mozL10n.translateFragment(this.shadowRoot);
  };

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    /* We need to import the template content into the current document so that
     * any Custom Elements are properly recognized and instanciated. */
    var node = document.importNode(template.content, true);
    shadow.appendChild(node);
    ComponentUtils.style.call(this, baseurl);

    var learnmoreLink = shadow.querySelector('.learnmore-link');
    learnmoreLink.addEventListener('click', this._learnmore.bind(this));

    var confirm = this.confirm = shadow.querySelector('gaia-confirm');
    confirm.addEventListener('confirm', () => {
      this.dispatchEvent(new CustomEvent('confirm'));
    });
    this._mirrorHiddenAttribute();

    /* will be used in attachedCallback and detachedCallback */
    this._localizeShadowDom = this._localizeShadowDom.bind(this);
  };

  proto.attachedCallback = function() {
    navigator.mozL10n.once(this._localizeShadowDom);
    window.addEventListener('localized', this._localizeShadowDom);
  };

  proto.detachedCallback = function() {
    window.removeEventListener('localized', this._localizeShadowDom);
  };

  proto._learnmore = function(e) {
    e.preventDefault();

    if (window.MozActivity) {
      this.dispatchEvent(new CustomEvent('learnmore'));

      /* jshint nonew: false */
      new MozActivity({
        name: 'configure',
        data: {
          section: 'applicationStorage'
        }
      });
    }
  };

  proto._mirrorHiddenAttribute = function() {
    if (this.hasAttribute('hidden')) {
      this.confirm.setAttribute('hidden', '');
    } else {
      this.confirm.removeAttribute('hidden');
    }
  };

  proto.attributeChangedCallback = function(name) {
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
      <a href='#'
         class="learnmore-link"
         data-l10n-id="lowstorage-dialog-learnmore"></a>
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
