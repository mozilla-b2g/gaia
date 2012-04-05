'use stricts';

var UITest = {
  get testList() {
    delete this.testList;
    return this.testList = document.getElementById('test-list');;
  },
  get iframe() {
    delete this.iframe;
    return this.iframe = document.getElementById('test-iframe');
  },
  init: function ut_init() {
    this.testList.addEventListener('click', this);
    document.body.addEventListener('transitionend', this);
    window.addEventListener('keyup', this);
  },
  uninit: function ut_uninit() {
    this.testList.removeEventListener('click', this);
    document.body.removeEventListener('transitionend', this);
    window.removeEventListener('keyup', this);
  },
  handleEvent: function ut_handleEvent(ev) {
    switch (ev.type) {
      case 'keyup':
        if (ev.keyCode != ev.DOM_VK_ESCAPE)
          return;
        if (this.closeTest())
          ev.preventDefault();
        break;
      case 'click':
        var name = ev.target.dataset.name;
        if (!name)
          return;
        this.openTest(name);
        break;
      case 'transitionend':
        if (document.body.classList.contains('test')) {
          // openTest
          this.iframe.src = './tests/' + this.name + '.html';
        } else {
          // clseTest
          this.iframe.src = 'about:blank';
        }
        break;
    };
  },
  openTest: function ut_openTest(name) {
    this.name = name;
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
