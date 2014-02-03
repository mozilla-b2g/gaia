'use strict';

/**
 * Base Provider class
 */
function Provider() {
}

Provider.prototype = {

  /**
   * Name of the provider
   * Overridden at the child provider level
   */
  name: 'Provider',

  /**
   * Initializes the provider container and adds listeners
   */
  init: function() {
    this.container = document.getElementById(this.name.toLowerCase());
    this.container.addEventListener('click', this.click.bind(this));
  },

  /**
   * Clears the rendered results of this provider from the app grid
   */
  clear: function() {
    this.container.innerHTML = '';
  },

  /**
   * Handler when a result is clicked
   */
  click: function() {},

  /**
   * Aborts any in-progress request.
   */
  abort: function() {
    if (this.request && this.request.abort) {
      this.request.abort();
    }
  },

  /**
   * Renders a set of results.
   * Each result may contain the following attributes:
   * - title: The title of the app.
   * - meta: Secondary content to show for the result.
   * - icon: The icon of the result.
   * - dataset: Data attributes to apply to the result.
   */
  render: function(results) {
    //<div class="result" data-url="mozilla.com">
    //  <img class="icon" src="..." />
    //  <div class="urlwrapper">
    //    <span class="title">My Urlasljd alskdja lsdjka sldjk</span>
    //    <small class="url">http://url.com</small>
    //  </div>
    //</div>

    var frag = document.createDocumentFragment();
    results.forEach(function(config) {

      var result = document.createElement('div');
      var icon = document.createElement('img');
      var description = document.createElement('div');
      var title = document.createElement('span');
      var meta = document.createElement('small');

      result.classList.add('result');
      icon.classList.add('icon');
      description.classList.add('description');
      title.classList.add('title');
      meta.classList.add('meta');

      for (var i in config.dataset) {
        result.dataset[i] = config.dataset[i];
      }

      if (config.icon && /^(app|http)/.test(config.icon)) {
        icon.src = config.icon;
      } else if (config.icon) {
        icon.src = window.URL.createObjectURL(config.icon);
        icon.onload = function() { window.URL.revokeObjectURL(icon.src); };
      } else {
        icon.classList.add('empty');
      }

      title.innerHTML = config.title;
      if (config.meta) {
        meta.innerHTML = config.meta;
      }

      description.appendChild(title);
      description.appendChild(meta);
      result.appendChild(icon);
      result.appendChild(description);
      frag.appendChild(result);
    });
    this.container.appendChild(frag);
  }
};
