'use strict';
/* global MozActivity */
/* jshint nonew: false */

(function(exports) {
  var App = function() {
    this.start();
  };

  App.prototype.theme = 'skin-';
  App.prototype.activity = null;
  App.prototype.UI = document.getElementById('ui');
  App.prototype.ICON = document.getElementById('icon');
  App.prototype.ACTIVITY_TOOLBAR = document.getElementById('activity-toolbar');
  App.prototype.TITLE = document.getElementById('title');
  App.prototype.HEADER = document.getElementById('header');
  App.prototype.INPUT = document.getElementById('input');
  App.prototype.start = function() {
    var filename = window.location.pathname.split('/').pop();
    document.title = filename.split('.')[0];
    this.TITLE.textContent = document.title;
    this.UI.classList.add(this.theme);
    document.addEventListener('click', this);
    navigator.mozSetMessageHandler('activity',
      this.webActivityHandler.bind(this));
    window.addEventListener('message', this);
    window.addEventListener('resize', this);
  };

  App.prototype.handleEvent = function(evt) {
    if (evt.type === 'message') {
      console.log(evt);
      switch (evt.data) {
        case 'hideHeader':
          this.HEADER.classList.add('hidden');
          break;
        case 'useBack':
          this.ICON.classList.remove('hidden');
          break;
      }
      return;
    } else if (evt.type == 'resize') {
      if (window.innerHeight < 60) {
        this.TITLE.textContent = '(attention)' + this.TITLE.textContent;
        document.body.classList.add('toaster');
      } else {
        this.TITLE.textContent = this.TITLE.textContent.replace('(attention)',
          '');
        document.body.classList.remove('toaster');
      }
    }
    if (evt.target.tagName && evt.target.tagName.toLowerCase() !== 'button') {
      return;
    }
    var data = evt.target.dataset;
    if (!data) {
      return;
    }
    if (data.activityHandle) {
      if (this.activity) {
        this.activity['post' + data.activityHandle](
          this.INPUT.value || new Date());
      }
    } else if (data.activity) {
      var request = new MozActivity({
        name: 'test-' + data.activity
      });
      request.onsuccess = function() {
        this.INPUT.value = request.result;
      }.bind(this);
      request.onerror = function() {
        this.INPUT.value = 'canceled';
      }.bind(this);
    } else if (data.dialog) { // for window.open dialog test
      window.open('test:test.sheet', '_blank', 'dialog');
    } else if (data.target) {
      var child = window.open(data.target, data.target, data.feature);
      if (data.feature !== 'dialog') {
        console.log('posting message 1 to ...', window.location.origin);
        child.postMessage('useBack', window.location.origin);
      } else {
        console.log('posting message 2 to ...', window.location.origin);
        child.postMessage('hideHeader', window.location.origin);
      }
    } else {
      if (!this.activity) {
        window.close();
      } else {
        this.activity.postError('canceled');
      }
    }
  };

  App.prototype.hideActivityPoster = function() {
    this.useBack();
    document.title = document.title.replace(/(activity)/, '');
    this.TITLE.textContent = document.title;
    this.ACTIVITY_TOOLBAR.classList.add('hidden');
  };

  App.prototype.showActivityPoster = function() {
    this.useClose();
    document.title = '(Activity) ' + document.title;
    this.TITLE.textContent = document.title;
    this.ACTIVITY_TOOLBAR.classList.remove('hidden');
  };

  App.prototype.useClose = function() {
    this.ICON.classList.remove('hidden');
    this.ICON.classList.remove('icon-back');
    this.ICON.classList.add('icon-close');
  };

  App.prototype.useBack = function() {
    this.ICON.classList.remove('hidden');
    this.ICON.classList.remove('icon-close');
    this.ICON.classList.add('icon-bacl');
  };

  App.prototype.webActivityHandler = function(activityRequest) {
    this.activity = activityRequest;
    this.showActivityPoster();
  };

  new App();
}(window));
