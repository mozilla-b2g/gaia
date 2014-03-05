'use strict';

(function(exports) {
  var App = function() {
    this.start();
  };

  App.prototype.activity = null;
  App.prototype.UI = document.getElementById('ui');
  App.prototype.ICON = document.getElementById('icon');
  App.prototype.ACTIVITY_TOOLBAR = document.getElementById('toolbar');
  App.prototype.TITLE = document.getElementById('title');
  App.prototype.start = function() {
    document.addEventListener('click', this);
    navigator.mozSetMessageHandler('activity', this.webActivityHandler.bind(this));
  };

  App.prototype.handleEvent = function(evt) {
    if (evt.target.tagName.toLowerCase() !== 'button') {
      return;
    }
    var data = evt.target.dataset;
    if (data.activityHandle) {
      if (this.activity) {
        this.activity['post' + data.activityHandle]();
      }
    } else if (data.activity) {
      new MozActivity({
        name: 'test-' + data.activity
      });
    } else if (data.target) {
      window.open(data.target, data.target, data.feature);
    } else {
      window.close();
    }
  };

  App.prototype.hideActivityPoster = function() {
    this.useBack();
    document.title = document.title.replace(/(activity)/, '');
    this.TITLE.textContent = document.title;
    this.ACTIVITY_TOOLBAR.classList.add('hidden');
  };

  App.prototype.showActivityPoster = function() {
    useClose();
    document.title = '(Activity)' + document.title;
    this.TITLE.textContent = document.title;
    this.ACTIVITY_TOOLBAR.classList.remove('hidden');
  };

  App.prototype.useBack = function() {
    this.ICON.classList.remove('icon-back');
    this.ICON.classList.add('icon-close');
  }

  App.prototype.useBack = function() {
    this.ICON.classList.remove('icon-close');
    this.ICON.classList.add('icon-bacl');
  };

  App.prototype.webActivityHandler = function(activityRequest) {
    this.activity = activityRequest;
    this.showActivityPoster();
  };

  new App();
}(window));