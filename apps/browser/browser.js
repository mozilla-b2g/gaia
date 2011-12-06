var Browser = {
  get backButton() {
    delete this.backButton;
    return this.backButton =
      document.getElementById('browser-back-button');
  },

  get goButton() {
    delete this.goButton;
    return this.goButton =
      document.getElementById('browser-go-button');
  },

  get content() {
    delete this.content;
    return this.content = document.getElementById('browser-iframe');
  },

  get urlBar() {
    delete this.urlBar;
    return this.urlBar =
      document.getElementById('browser-url');
  },

  get iframe() {
    delete this.iframe;
    return document.getElementById('browser-iframe');
  },

  init: function() {
    this.goButton.addEventListener('click', (function goHandler(evt) {
      this.navigate(this.urlBar.value);
      evt.preventDefault();
    }).bind(this));

    this.iframe.addEventListener('load', (function loadedHandler(evt) {
      this.urlBar.classList.remove('loading');
    }).bind(this));

    this.backButton.addEventListener('click', (function backHandler(evt) {
      this.back();
    }).bind(this));

    this.navigate(this.urlBar.value);
  },

  navigate: function(url) {
    this.urlBar.value = url;
    this.content.setAttribute('src', url);
    this.urlBar.classList.add('loading');
  },

  back: function() {
    this.content.contentWindow.history.back();
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});
