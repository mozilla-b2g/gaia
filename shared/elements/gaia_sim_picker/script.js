'use strict';
/* global ComponentUtils, LazyLoader */

/**
 * GaiaSimPicker is a helper for dynamically generating menus for selecting SIM
 * cards when making calls, sending SMS, etc. It also returns any currently
 * in-use SIMs if there is an active call, but only when an app has mozTelephony
 * permissions.
 *
 * Dependencies: gaia-menu web component.
 */
window.GaiaSimPicker = (function(win) {
  // Extend from HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaSimPickerBaseurl ||
    '/shared/elements/gaia_sim_picker/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    shadow.innerHTML = template;

    this._menu = this.shadowRoot.querySelector('gaia-menu');

    LazyLoader.load(['/shared/js/component_utils.js'], function() {
      ComponentUtils.style.call(this, baseurl);
    }.bind(this));

    navigator.mozL10n.ready(this._localizeShadowDom.bind(this));
  };

  proto._domBuilt = false;

  proto._simSelectedCallbacks = [];

  proto._dispatchSimSelected = function(cardIndex) {
    var simSelectedEvent = new CustomEvent('gaiasimpicker-simselected', {
      canBubble: true,
      cancelable: true,
      detail: {
        cardIndex: cardIndex
      }
    });

    if (this.dispatchEvent(simSelectedEvent)) {
      // Only call the stored callbacks if the event wasn't preventDefaulted.
      proto._simSelectedCallbacks.forEach(function(callback) {
        callback(cardIndex);
      });
      proto._simSelectedCallbacks = [];
    }
  };

  /**
   * Localize the component manually as l10n attributes are not supported
   * within the shadow dom. See also: bug 1026236.
   */
  proto._localizeShadowDom = function() {
    navigator.mozL10n.translateFragment(this.shadowRoot);
  };

  proto.getOrPick = function(defaultCardIndex,
                             phoneNumber,
                             simSelectedCallback) {
    if (simSelectedCallback) {
      this._simSelectedCallbacks.push(simSelectedCallback);
    }

    if (window.TelephonyHelper) {
      var inUseSim = window.TelephonyHelper.getInUseSim();
      if (inUseSim !== null) {
        this._dispatchSimSelected(inUseSim);
        return;
      }
    }

    var dialViaElt = this.shadowRoot.querySelector('#sim-picker-dial-via');
    if (phoneNumber) {
      navigator.mozL10n.setAttributes(dialViaElt,
                                      'gaia-sim-picker-dial-via-with-number',
                                      {phoneNumber: phoneNumber});
    } else {
      dialViaElt.setAttribute('data-l10n-id', 'gaia-sim-picker-select-sim');
    }

    this._buildDom();

    var simButtons = this.shadowRoot.querySelectorAll(
      'button[data-card-index]');

    for (var i = 0; i < simButtons.length; i++) {
      if (simButtons[i].dataset.cardIndex == defaultCardIndex) {
        simButtons[i].classList.add('is-default');
      } else {
        simButtons[i].classList.remove('is-default');
      }
    }

    // we want to wait for l10n to happen before we display the UI
    LazyLoader.load(['/shared/elements/gaia_menu/script.js'], function() {
      navigator.mozL10n.once(function() {
        this._menu.show();
        this.focus();
      }.bind(this));
    }.bind(this));
  };

  proto._buildDom = function() {
    if (this._domBuilt) {
      return;
    }

    this._domBuilt = true;

    var templateNode = this.shadowRoot.querySelector(
      '#sim-picker-button-template');

    for (var i = 0; i < navigator.mozIccManager.iccIds.length; i++) {
      var clonedNode = templateNode.cloneNode(true);
      clonedNode.dataset.cardIndex = i;
      clonedNode.addEventListener('click', this);

      var button = clonedNode.querySelector('.js-sim-picker-button');
      // For example only; l10n will overwrite this.
      button.textContent = 'SIM' + (i+1);
      navigator.mozL10n.setAttributes(
        button, 'gaia-sim-picker-button', {n: i + 1});
      templateNode.parentNode.insertBefore(clonedNode, templateNode);
    }
    templateNode.remove();
  };

  proto.handleEvent = function(e) {
    if (e) {
      e.preventDefault();
    }
    if (e.target.nodeName !== 'BUTTON') {
      return;
    }

    if (e.target.dataset.cardIndex) {
      this._dispatchSimSelected(parseInt(e.target.dataset.cardIndex));
    } else {
      // Clear the stored callbacks anyways since the user must have hit cancel.
      this._simSelectedCallbacks = [];
    }

    this._menu.hide();
  };

  var stylesheet = baseurl + '../gaia_menu/style.css';

  // TODO: We should make this a template node and use template.cloneNode, but
  // nested web components don't work yet using this method.
  var template = '<style scoped>' +
    '@import url(' + stylesheet + ');</style>' +
    `<gaia-menu hidden>
      <header id="sim-picker-dial-via">Dial 12345 via</header>
      <button id="sim-picker-button-template">
        <span class="js-sim-picker-button">
          SIMX
        </span>
        <span class="sim-default" data-l10n-id="gaia-sim-picker-button-default">
          (default)
        </span>
      </button>
    </gaia-menu>`;

  // Register and return the constructor
  return document.registerElement('gaia-sim-picker', { prototype: proto });
})(window);
