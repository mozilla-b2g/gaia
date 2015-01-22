/*global MediaUtils, videostorage*/
/*exported GalleryInfoDialog*/
/*jshint esnext:true*/
'use strict';

var GalleryInfoDialog = (function() {

/**
 * Template for this component.
 *
 * @type {Object}
 */
var template =
`<style scoped>
  section {
    vertical-align: top; /* override confirm.css */
    margin: 0;
    padding: 0;
  }
  section > dl {
    border-top: none; /* override confirm.css */
    margin: 0.6rem 2rem 0 2rem;
    padding: 0;
  }
  section > dl > dt {
    display: block;
    font-size: 1.6rem;
    line-height: 1;
    font-weight: 400;
    color: #8a9699;
    margin: 1rem 0 0.3rem 0;
    padding: 0 0 0 1rem;
    width: 100% !important; /* override confirm.css */
    float: none !important; /* override confirm.css */
  }
  section > dl > dd {
    display: block;
    color: #fff;
    font-size: 1.9rem;
    line-height: 1;
    font-weight: 400;
    margin: 0;
    padding: 0 0 1.2rem 1rem;
    border-bottom: 0.1rem solid rgba(255, 255, 255, 0.1);
  }
  section > dl > dd:last-child {
    border-bottom: none;
  }
</style>
<form role="dialog" data-type="confirm">
  <section>
    <dl>
      <dt data-l10n-id="name-label"></dt>
      <dd class="value" data-value="name"></dd>
      <dt data-l10n-id="size-label"></dt>
      <dd class="value" data-value="size"></dd>
      <dt data-l10n-id="image-type-label"></dt>
      <dd class="value" data-value="type"></dd>
      <dt data-l10n-id="date-taken-label"></dt>
      <dd class="value" data-value="date"></dd>
      <dt data-l10n-id="resolution-label"></dt>
      <dd class="value" data-value="resolution"></dd>
    </dl>
  </section>
  <menu>
    <button type="button" class="full"
        data-l10n-id="close-button"
        data-action="close">
    </button>
  </menu>
</form>`;

/**
 * Updates the contents of the dialog to reflect the
 * information for the current item.
 *
 * @private
 */
function updateItem(dialog) {
  var item = dialog._item;
  if (item.metadata.video) {
    var request = videostorage.get(item.metadata.video);
    request.onsuccess = () => {
      item.size = request.result.size;
      item.type = request.result.type || 'video/3gp';
      updateValues();
    };
  } else {
    updateValues();
  }

  function updateValues() {
    var name = (item.metadata.video || item.name).split('/').pop();
    var resolution = item.metadata.width + 'x' + item.metadata.height;
    var valueElements = dialog.valueElements;
    valueElements.name.textContent = name;
    valueElements.size.textContent = MediaUtils.formatSize(item.size);
    valueElements.type.textContent = item.type;
    valueElements.date.textContent = MediaUtils.formatDate(item.date);
    valueElements.resolution.textContent = resolution;
  }
}

/**
 * Prototype extends from from `HTMLElement.prototype`.
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Sets the item used to populate this dialog.
 *
 * @param {Object} item
 *
 * @public
 */
proto.setItem = function(item) {
  this._item = item;
  updateItem(this);
};

/**
 * Called when an instance of this element is created.
 *
 * @private
 */
proto.createdCallback = function() {
  this.innerHTML = template;

  this.valueElements = {
    name: this.querySelector('[data-value="name"]'),
    size: this.querySelector('[data-value="size"]'),
    type: this.querySelector('[data-value="type"]'),
    date: this.querySelector('[data-value="date"]'),
    resolution: this.querySelector('[data-value="resolution"]')
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

var GalleryInfoDialog = document.registerElement('gallery-info-dialog', {
  prototype: proto
});

// Export the constructor and expose the `prototype` (Bug 1048339).
GalleryInfoDialog._prototype = proto;
return GalleryInfoDialog;

})();
