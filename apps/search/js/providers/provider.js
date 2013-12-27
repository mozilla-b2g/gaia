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
    this.container.addEventListener('click', this.click);
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
   * Renders a set of results.
   * Each result may contain the following attributes:
   * - title: The title of the app.
   * - icon: The icon of the result.
   * - dataset: Data attributes to apply to the result.
   */
  render: function(config) {}
};
