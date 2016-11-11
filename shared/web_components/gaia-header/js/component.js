'use strict';

window.GaiaHeader = (function() {

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  proto.createdCallback = function() {
    var template = document.getElementById('header-template');
    var shadow = this.createShadowRoot();

    this.template = template.content.cloneNode(true);
    this.configureActionButton();
    this.configureSkin();
    this.styleHack();

    shadow.appendChild(this.template);
  };

  /**
   * We clone the scoped stylesheet and append
   * it outside the shadow-root so that we can
   * style projected <content> without the need
   * of the :content selector.
   *
   * When the :content selector lands, we won't
   * need this hack anymore and can style projected
   * <content> from stylesheets within the shadow root.
   *
   * BUG:992249
   *
   * @private
   */
  proto.styleHack = function() {
    var style = this.template.querySelector('style');
    this.appendChild(style.cloneNode(true));
  };

  /**
   * Configure the action button based
   * on the value of the `data-action`
   * attribute.
   *
   * @private
   */
  proto.configureActionButton = function() {
    var inner = this.template.getElementById('action-button-inner');
    var button = this.template.getElementById('action-button');
    var type = this.dataset.action;

    if (!type) {
      button.style.display = 'none';
      return;
    }

    button.dataset.action = type;
    inner.classList.add('icon-' + type);
    button.addEventListener('click', proto.onActionButtonClick.bind(this));
  };

  /**
   * Configure the skin based on the
   * `data-skin` attribute.
   *
   * @private
   */
  proto.configureSkin = function() {
    var skin = this.dataset.skin;
    if (skin) {
      var header = this.template.getElementById('header');
      header.parentNode.classList.add('skin-' + skin);
    }
  };

  /**
   * Handle clicks on the action button.
   *
   * UNKNOWN: Why is the callback fired async?
   *
   * @param  {Event} e
   * @private
   */
  proto.onActionButtonClick = function(e) {
    var config = { detail: { type: e.target.dataset.action } };
    var actionEvent = new CustomEvent('action', config);
    setTimeout(this.dispatchEvent.bind(this, actionEvent));
  };

  // Register an return the constructor
  return document.registerElement('gaia-header', { prototype: proto });
})();
