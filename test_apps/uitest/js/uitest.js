'use stricts';

var UITest = {
  get testList() {
    delete this.testList;
    return this.testList = document.getElementById('test-list');
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
  init: function ut_init() {
    this.testList.addEventListener('click', this);
    this.iframe.addEventListener('load', this);
    this.iframe.addEventListener('unload', this);
    document.body.addEventListener('transitionend', this);
    window.addEventListener('keyup', this);
    window.addEventListener('hashchange', this);
    this.backBtn.addEventListener('click', this);

    var name = this.getNameFromHash();
    if (name)
      this.openTest(name);
  },
  uninit: function ut_uninit() {
    this.testList.removeEventListener('click', this);
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
        var name = this.getNameFromHash();
        if (!name) {
          this.closeTest();
          return;
        }
        this.panelTitle.textContent = name;
        this.openTest(name);
        break;
      case 'transitionend':
        var name = this.getNameFromHash();
        if (document.body.classList.contains('test')) {
          // openTest
          this.iframe.src = './tests/' + name + '.html';
        } else {
          // closeTest
          this.iframe.src = 'about:blank';
        }
        break;
    }
  },
  openTest: function ut_openTest() {
    document.body.classList.add('test');
  },
  closeTest: function ut_closeTest() {
    var isOpened = document.body.classList.contains('test');
    if (!isOpened)
      return false;
    document.body.classList.remove('test');
    return true;
  }
};

window.onload = UITest.init.bind(UITest);
