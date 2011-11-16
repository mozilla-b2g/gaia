var Browser = {
  urlHistory: [],
  currentURL: -1,
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

  get urlbar() {
    delete this.urlbar;
    return this.urlbar =
      document.getElementById('browser-url');
  },
  init: function() {
    this.goButton.addEventListener('click', (function goHandler(evt) {
      this.navigate(this.urlbar.value);
      evt.preventDefault();
    }).bind(this));

    this.backButton.addEventListener('click', (function backHandler(evt) {
      this.back();
    }).bind(this));

    this.navigate(this.urlbar.value);
  },

  navigate: function(url, ignoreHistory) {
    this.urlbar.value = url;
    this.content.setAttribute('src', url);

    if (ignoreHistory)
      return;

    this.urlHistory.push(url);
    this.currentURL++;
  },

  back: function() {
    if (!this.currentURL)
      return;
    this.currentURL--;

    var url = this.urlHistory[this.currentURL];
    this.navigate(url, true);
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});

