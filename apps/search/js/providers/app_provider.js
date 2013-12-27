/**
 * Parent class that provides "app-like" results
 */
function AppProvider() {
}

AppProvider.prototype = {

  __proto__: Provider.prototype,

  /**
   * Overrides Provider::render
   * Renders a set of results to the app grid.
   */
  render: function(results) {
    var frag = document.createDocumentFragment();
    results.forEach(function eachResult(result) {
      var el = document.createElement('div');
      el.dataset.provider = this.name;
      for (var i in result.dataset) {
        el.dataset[i] = result.dataset[i];
      }

      var img = document.createElement('img');
      img.src = result.icon;
      el.appendChild(img);

      var title = document.createTextNode(result.title);
      el.appendChild(title);

      frag.appendChild(el);
    }, this);
    this.container.appendChild(frag);
  }
};
