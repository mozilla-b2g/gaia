window.realL10n = window.navigator.mozL10n;

var MockMozL10n = window.navigator.mozL10n = {
  get: function get(key, params) {
    var out = key;

    if (params) {
      Object.keys(params).forEach(function(id) {
        out += params[id];
      });
    }

    return out;
  },
  localize: function localize(element, key, params) {
    element.textContent = this.get(key, params);
  }
};
