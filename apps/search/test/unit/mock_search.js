'use strict';

window.Search = {
  _port: null,
  providers: {},
  init: function() {},
  provider: function(provider) {
    this.providers[provider.name] = provider;
  },
  onSearchInput: function() {},
  close: function() {},
  openBrowsingWindow: function() {},
  openWindow: function() {},
  setInput: function() {},
  collect: function(provider, results) {
    provider.render(results);
  }
};
