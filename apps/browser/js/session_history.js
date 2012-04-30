var SessionHistory = {
  history: [],
  historyIndex: -1,

  back: function() {
    if (this.backLength() < 1)
      return;
    Browser.navigate(this.history[--this.historyIndex]);
  },

  forward: function() {
    if (this.forwardLength() < 1)
      return;
    Browser.navigate(this.history[++this.historyIndex]);
  },

  historyLength: function() {
    return this.history.length;
  },

  backLength: function() {
   if (this.history.length < 2)
     return 0;
   return this.historyIndex;
  },

  forwardLength: function() {
    return this.history.length - this.historyIndex - 1;
  },

  pushState: function(stateObj, title, url) {
    var history = this.history;
    var index = this.historyIndex;
    if (url == history[index])
      return;

    // If history contains forward entries, replace them with the new location
    if (this.forwardLength()) {
      history.splice(index + 1, this.forwardLength(), url);
      this.historyIndex++;
    } else {
      // Otherwise just append the new location to the end of the array
      this.historyIndex = history.push(url) - 1;
    }
  }
};
