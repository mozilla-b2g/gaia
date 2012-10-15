window.realL10n = window.navigator.mozL10n;

window.navigator.mozL10n = {
  get: function get(key) {
    return key;
  }
};
