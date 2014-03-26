'use stricts';

var UITest = {
  get UItests() {
    delete this.UItests;
    return this.UItests = document.getElementById('UI-tests');
  },
  get APItests() {
    delete this.APItests;
    return this.APItests = document.getElementById('API-tests');
  },
  get HWtests() {
    delete this.HWtests;
    return this.HWtests = document.getElementById('HW-tests');
  },
 get iframe() {
    delete this.iframe;
    return this.iframe = document.getElementById('test-iframe');
  },
  get backBtn() {
    delete this.backBtn;
    return this.backBtn = document.getElementById('test-panel-back');
  },
  get panelTitle() {
    delete this.panelTitle;
    return this.panelTitle = document.getElementById('test-panel-title');
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
        if (window.location.hash == '#UI')
        {
          this.UItests.classList.remove('invisible');
          if (!this.HWtests.classList.contains('invisible'))
            this.HWtests.classList.add('invisible');
          if (!this.APItests.classList.contains('invisible'))
            this.APItests.classList.add('invisible');
        }
        else if (window.location.hash == '#API')
        {
          this.APItests.classList.remove('invisible');
          if (!this.UItests.classList.contains('invisible'))
            this.UItests.classList.add('invisible');
          if (!this.HWtests.classList.contains('invisible'))
            this.HWtests.classList.add('invisible');
        }
        else if (window.location.hash == '#HW')
        {
          this.HWtests.classList.remove('invisible');
          if (!this.UItests.classList.contains('invisible'))
            this.UItests.classList.add('invisible');
          if (!this.APItests.classList.contains('invisible'))
            this.APItests.classList.add('invisible');
        }
        else
        {
          var name = this.getNameFromHash();
          if (!name) {
            this.closeTest();
            return;
          }
          this.panelTitle.textContent = name;
          this.openTest(name);
        }
        break;
      case 'transitionend':
        var name = this.getNameFromHash();
        if (!name)
          this.iframe.src = 'about:blank';
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
    }, 200);
  },
  closeTest: function ut_closeTest() {
    var isOpened = document.body.classList.contains('test');
    if (!isOpened)
      return false;
    document.body.classList.remove('test');

    // select tab after close test iframe
    window.location.hash = this.currentTab;
    return true;
  }
};

window.addEventListener('load', UITest.init.bind(UITest));
