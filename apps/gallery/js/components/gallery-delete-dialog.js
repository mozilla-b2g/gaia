/*exported GalleryDeleteDialog*/
/*jshint esnext:true*/
'use strict';

var GalleryDeleteDialog = (function() {

/**
 * Template for this component.
 *
 * @type {Object}
 */
var template =
`<form role="dialog" data-type="confirm">
  <section>
    <p data-value="message"></p>
  </section>
  <menu>
    <button type="button"
        data-l10n-id="cancel"
        data-action="cancel">
    </button>
    <button type="button" class="danger"
        data-l10n-id="delete"
        data-action="delete">
    </button>
  </menu>
</form>`;

/**
 * Prototype extends from from `HTMLElement.prototype`.
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Sets the message used to populate this dialog.
 *
 * @param {Object} message
 *
 * @public
 */
proto.setMessage = function(message) {
  this._message = message;
  this.valueElements.message.textContent = this._message;
};

/**
 * Called when an instance of this element is created.
 *
 * @private
 */
proto.createdCallback = function() {
  this.innerHTML = template;

  this.valueElements = {
    message: this.querySelector('[data-value="message"]')
  };

  this.addEventListener('click', (evt) => {
    var action = evt.target.getAttribute('data-action');
    if (action) {
      this.dispatchEvent(new CustomEvent('action', {
        detail: action
      }));
    }
  });
};

var GalleryDeleteDialog = document.registerElement('gallery-delete-dialog', {
  prototype: proto
});

// Export the constructor and expose the `prototype` (Bug 1048339).
GalleryDeleteDialog._prototype = proto;
return GalleryDeleteDialog;

})();
