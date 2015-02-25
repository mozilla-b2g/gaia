/* global AccessibilityHelper */
(function() {
  'use strict';

  var UITest = {
    get APItests() {
      return document.getElementById('API-tests');
    },
    get iframe() {
      return document.getElementById('test-iframe');
    },
    get backBtn() {
      return document.getElementById('test-panel-back');
    },
    get panelTitle() {
      return document.getElementById('test-panel-title');
    },
    get tabs() {
      return document.querySelectorAll('[role="tab"]');
    },
    get APITab() {
      return document.getElementById('API');
    },
    currentTab: 'UI',
    handleNotificationMessage: function(message) {
      if (!message.clicked) {
        return;
      }

      // handle notifications when uitest is closed
      navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
        var app = evt.target.result;

        app.launch();
      };
    },
    init: function ut_init() {
      this.iframe.addEventListener('load', this);
      this.iframe.addEventListener('unload', this);
      document.body.addEventListener('transitionend', this);
      window.addEventListener('keyup', this);
      window.addEventListener('hashchange', this);
      this.backBtn.addEventListener('click', this);
      navigator.mozSetMessageHandler('notification', function(msg) {
        this.handleNotificationMessage(msg);
      }.bind(this));

      var name = this.getNameFromHash();
      if (name) {
        this.openTest(name);
      }
      else {
        // if no test is specified, load UI tests list (select UI tab)
        window.location.hash = 'UI';
      }
    },
    uninit: function ut_uninit() {
      this.iframe.removeEventListener('load', this);
      this.iframe.removeEventListener('unload', this);
      document.body.removeEventListener('transitionend', this);
      window.removeEventListener('keyup', this);
      window.removeEventListener('hashchange', this);
      this.backBtn.removeEventListener('click', this);
    },
    getNameFromHash: function ut_getNameFromHash() {
      return (/\btest=(.+)(&|$)/.exec(window.location.hash) || [])[1];
    },
    handleEvent: function ut_handleEvent(ev) {
      var name;
      switch (ev.type) {
        case 'click':
          if (ev.target != this.backBtn) {
            return;
          }
          if (window.location.hash) {
            window.location.hash = '';
          }
          break;
        case 'load':
          this.iframe.contentWindow.addEventListener('keyup', this);
          break;
        case 'unload':
          this.iframe.contentWindow.removeEventListener('keyup', this);
          break;
        case 'hashchange':
          console.log(window.location.hash);
          if (window.location.hash == '#API') {
            this.APItests.classList.remove('invisible');
            AccessibilityHelper.setAriaSelected(this.APITab, this.tabs);
          } else {
            name = this.getNameFromHash();
            if (!name) {
              this.closeTest();
              return;
            }
            this.panelTitle.textContent = name;
            this.openTest(name);
          }
          break;
        case 'transitionend':
          name = this.getNameFromHash();
          if (!name) {
            this.iframe.src = 'about:blank';
          }
          break;
      }
    },
    openTest: function ut_openTest(name) {
      // save tab name from URL
      // e.g. '#test=UI/empty' => 'UI'
      this.currentTab = (/=\b(.+)\//.exec(window.location.hash) || [])[1];
      document.body.classList.add('test');

      var self = this;
      window.setTimeout(function openTestPage() {
        self.iframe.src = './tests_html/' + name + '.html';
        // we need to focus the iframe to let the key event send to it.
        self.iframe.focus();
      }, 200);
    },
    closeTest: function ut_closeTest() {
      var isOpened = document.body.classList.contains('test');
      if (!isOpened) {
        return false;
      }
      document.body.classList.remove('test');

      // select tab after close test iframe
      window.location.hash = this.currentTab;
      return true;
    }
  };

  window.addEventListener('load', UITest.init.bind(UITest));
})();
