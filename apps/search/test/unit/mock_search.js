window.Search = {
  _port: null,
  providers: {},
  init: function() {},
  provider: function(provider) {
    this.providers[provider.name] = provider;
  },
  onSearchInput: function() {},
  close: function() {},
  navigate: function() {},
  setInput: function() {}
};
