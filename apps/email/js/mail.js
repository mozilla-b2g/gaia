/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const PAGE_TRANSITION_DURATION = 300,
  CACHE_DOM_PAGES = 2,
  DEFAULT_DIRECTION = 1,
  MESSAGES_PER_SCREEN = 5,

  //simple regexp for parse addresses
  R_ADDRESS_PARTS = /^(?:([\w\s]+) )?<(.+)>$/,

  R_HTML_TEMPLATE = /\{\{(\w+?)\}\}/g,

  STORE_ACCOUNTS_KEYS = 'mail:accounts',

  DEFAULT_FOLDER = 'INBOX';

var mail = {
  firstScreen: function() {

    const DOMAINS = {},
      R_EMAIL_DOMAIN = /@(.*)$/;

    //var pages = new Paging(nodes.firstScreen);

    //pages.registerPage(nodes.selectAccount);

    nodes.firstScreen.hidden = false;

    nodes.selectExistButton.addEventListener('click', function() {
      nodes.selectAccount.style.top = window.innerHeight + 'px';
      nodes.selectAccount.hidden = false;
      window.addEventListener('MozAfterPaint', function afterPaint() {
        window.removeEventListener('MozAfterPaint', afterPaint);

        Transition.run(nodes.selectAccount, {
          top: 0
        }, {
          duration: 300
        });

      });

      var accounts = mail.accounts.getAll();

      nodes.selectAccountList.innerHTML = '';
      
      accounts.forEach(function(account) {
        var li = document.createElement('li');
        //li.dataset.index = i;

        li.addEventListener('click', function() {

          account = mail.accounts.get(account);

          if (account) {
            window.removeEventListener('keyup', ESCLitener);
            nodes.firstScreen.hidden = true;
            mail.configAccount(account.account, account.password);
          }

        });

        nodes.selectAccountList.appendChild(
          li
        ).appendChild(
          document.createElement('h2')
        ).textContent = account;

      });

      window.addEventListener('keyup', ESCLitener);

      function ESCLitener(e) {
        if (e.keyCode === e.DOM_VK_ESCAPE) {
          e.preventDefault();
          Transition.stop(nodes.selectAccount);
          Transition.run(nodes.selectAccount, {
           top: window.innerHeight + 'px'
          }, {
            duration: 300
          });
          window.removeEventListener('keyup', ESCLitener);
        }
      }

    });

    nodes.loginForm.addEventListener('submit', function(e) {

      var account = this.account.value,
        password = this.password.value;

      e.preventDefault();

      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      nodes.firstScreen.hidden = true;

      mail.configAccount(account, password);

    });


    [].forEach.call(nodes.preSelectMail.querySelectorAll('img'), function(img) {
      DOMAINS[img.dataset.domain] = {
        title: img.alt,
        img: img.cloneNode(true)
      };
    });

    Object.freeze(DOMAINS);

    nodes.loginForm.account.addEventListener('updatevalue', function() {
        //will need to add autocomplete

        var parts = this.value.match(R_EMAIL_DOMAIN);

        nodes.preMailSelected.innerHTML = '';

        //let tmp;
        if (parts && parts[1] && DOMAINS[parts[1]]) {
          let tmp = DOMAINS[parts[1]];

          nodes.preMailSelected.appendChild(tmp.img);
          nodes.preMailSelected
            .appendChild(document.createElement('span'))
            .textContent = ' ' + tmp.title;

        }

    });

    nodes.preSelectMail.addEventListener('click', function(e) {
      var nodeName = e.target.nodeName.toLowerCase(),
        img;

      if (nodeName === 'img') {
        img = e.target;
      } else if (nodeName === 'a') {
        img = e.target.querySelector('img');
      } else {
        return;
      }


      {
        let account = nodes.loginForm.account,
          value = account.value,
          i = value.indexOf('@'),
          domain = img.dataset.domain,
          range = document.createRange();

        if (i !== -1) {
          //console.log(value.slice(i));
          value = value.slice(0, i) + '@' + domain;
        } else {
          i = value.length;
          value = value + '@' + domain;
        }

        account.value = value;
        account.focus();
        account.setSelectionRange(i, i);

      };

      e.preventDefault();

    });

    nodes.preSelectMail.addEventListener('mousedown', function(e) {
      e.preventDefault();
    }, true);

  },
  mailScreen: function(account) {

    var swipedTarget,
      taped = false,
      left = 0,
      width = 0,
      started = false,

      getMessage = function(target){

        while (!('messageId' in target.dataset)) {

          if ((target = target.parentNode) === nodes.mailScreen) {
            return null;
          };
          
        }

        return target;

      },
      cleanTap = function() {
        document.removeEventListener('tapstart', tapStart);
        document.removeEventListener('tapend', tapEnd);
        taped = false;
      },
      tapEnd = function() {

        mail.readMessage(swipedTarget);

        if (taped) {
          swipedTarget.classList.remove('highlight');
        }
        cleanTap();
        cleanSwipe();

      },
      tapStart = function() {
        swipedTarget.classList.add('highlight');
        taped = true;

        document.addEventListener('tapend', tapEnd);
      },
      cleanSwipe = function() {
        document.removeEventListener('swipestart', swipeStart);
        document.removeEventListener('mousemove', mouseMove);
        document.removeEventListener('swipeend', swipeEnd);
        swipedTarget = null;
      },
      swipeEnd = function() {
        swipedTarget.classList.remove('highlight');
        cleanSwipe();
      },
      swipeStart = function(e) {

        if (taped) {
          cleanTap();
        }

        if (e.detail & SWIPE_HORIZONTAL) {
          console.log('swipe');
          document.addEventListener('mousemove', mouseMove);
        }


      },
      mouseMove = function(e) {
        if (!started && left - e.layerX > width / 3) {
          started = true;
        }

        if (started) {

        }
      };

    nodes.mailScreen.hidden = false;

    nodes.mailScreen.mainContent.addEventListener('mousedown', function downListener(e) {
      swipedTarget = getMessage(e.target);

      if(!swipedTarget) {
        return;
      }

      left = e.layerX,
      width = swipedTarget.offsetWidth,
      started = false;

      document.addEventListener('tapstart', tapStart);
      //touch scroll did not fired like simple scroll :(
      //next code has no affect
      document.addEventListener('scroll', function scroll() {
        if (taped) {
          cleanTap();
        }
        document.removeEventListener('scroll', scroll);
      });

      if (left > width - width / 10) {
        document.addEventListener('swipestart', swipeStart);
      }

      document.addEventListener('swipeend', swipeEnd);

    }, true);

    mail.screens = new Paging(nodes.mailScreen);

    nodes.messageFrame.header 
      = nodes.messageFrame.querySelector('.message-frame-header');
    nodes.messageFrame.body 
      = nodes.messageFrame.querySelector('.message-frame-body');
  },
  configAccount: function(account, password) {
    //back-end function
    //of authorization and 
    //connection to server

    if (!mail.accounts.has(account)) {
      mail.accounts.add(account, account, {
        password: password,
        account: account
      });
    }


    mail.loadFolder(DEFAULT_FOLDER, function() {
      mail.mailScreen(account);
    });

  },
  loadMessages: function(interval, success, error) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'fakemsgs.json', true);

    xhr.onload = function(e) {
      try {

        let arr = JSON.parse(xhr.response);

        success && success.call(xhr, 
            arr.slice(0, Math.max(interval, arr.length))
          );

      } catch (e) {
        error && error.call(xhr, e);
      }
    };  

    xhr.onerror = function(e) {
      error && error.call(xhr, e);
    };

    xhr.send(null);
  },
  loadFolder: function(folder, callback) {

    var map = mail.folderMessages = new Map(),
      domList = document.createElement('section');

    mail.folder = {
      name: folder,
      domList: domList,
      map: map
    };

    folder = folder.toLowerCase().replace(/^\w/, function(w) {
      return w.toUpperCase();
    });

    nodes.folderTitle.textContent = folder;

    domList.className = 'messages-list';

    mail.loadMessages(MESSAGES_PER_SCREEN * 2, function(arr) {
      arr.forEach(function(message) {
        var domMessage = mail.messageConstructor(message);

        map.set(domMessage, message);

        domList.appendChild(domMessage);

      });
    });

    nodes.main.appendChild(domList);

    callback && callback(mail.folder);

  },
  defaultDirection: DEFAULT_DIRECTION,
  folderMessages: null,
  accounts: (function() {
    var accounts,
      saveAccounts = function() {
        try {
          localStorage[STORE_ACCOUNTS_KEYS] = JSON.stringify(accounts);
        } catch (e) {
          return false;
        }

        return true;
      };

    try {
      let tmp = localStorage[STORE_ACCOUNTS_KEYS];
      if (tmp) {
        accounts = JSON.parse(tmp);
      } else {
        throw void 0;
      }
    } catch (e) {
      accounts = {};
    };
    //console.log(accounts);
    return {
      add: function(main, account, data) {
        if (!main || !account) return false;

        if (accounts[main]) {
        
        } else {
          accounts[main] = {};
        }

        accounts[main][account] = data;

        return saveAccounts();
      },
      remove: function(main, account) {
        if (!main || !account) return false;

        if (accounts[main]) {
          let tmp = accounts[main];

          delete tmp[account];

          if (!Object.keys(tmp).length) {
            delete accounts[main];
          }
        }

        return saveAccounts();

      },
      has: function(main, account) {
        if (main && account && accounts[main]) {
          return account in accounts[main];
        } else if (main) {
          return main in accounts;
        } else {
          return false;
        }
      },
      get: function(main) {
        if (main && accounts[main]) {
          return accounts[main][main];
        }
      },
      getAll: function() {
        return Object.keys(accounts);
      }
    };

  }()),
  messageConstructor: function(data) {
    var message = document.createElement('article'),
      from = data.from.match(R_ADDRESS_PARTS),
      date = new Date(data.date);

    message.setAttribute('role', 'row');
    message.classList.add('message-summary');
    let header = message.appendChild(document.createElement('header'));
    header.classList.add('message-summary-header');
    let address = header.appendChild(document.createElement('address'));
    address.classList.add('message-summary-mail');
    address.appendChild(document.createElement('span')).textContent = [
      date.getDate(),
      date.getMonth() + 1,
      date.getYear() - 100
    ].join('.').replace(/(^|\.)(\d)(?!\d)($|\.)/g, '$10$2$3');
    let author = header.appendChild(document.createElement('h1'));
    author.classList.add('message-summary-author');
    author.textContent = from[1] || from[2];
    let subject = header.appendChild(document.createElement('h2'));
    subject.classList.add('message-summary-subject');
    subject.textContent = data.subject;
    let summary = message.appendChild(document.createElement('div'));
    summary.classList.add('message-summary-text');
    summary.textContent = data.body.slice(0, Math.min(data.body.length, 200));

    //message.dataset.index = 0;

    message.dataset.messageId = +new Date;

    return message;
  },
  readMessage: function(domMessage) {
    let iframe = document.createElement('iframe'),
      message = mail.folder.map.get(domMessage),
      header = nodes.messageFrame.header,
      body = nodes.messageFrame.body,
      headers = {
        From: message.from,
        To: message.to,
        cc: message.cc,
        bcc: message.bcc
      };

    for (let key in headers) {
      if (headers[key] && Object.prototype.hasOwnProperty.call(headers, key)) {
        header.appendChild(mail.createHeaderLine(key, headers[key]));
      }
    }

    let subject = header.appendChild(document.createElement('h2'));
    subject.className = 'message-frame-subject';
    subject.textContent = message.subject;

    body.style.height = '-moz-calc(100% - ' + header.offsetHeight + 'px)';

    let url = window.URL.createObjectURL(
        new Blob([message.body], {
          type: 'text\/html'
        })
      );

    //has no affect in gecko :(
    iframe.setAttribute('sandbox', '');

    iframe.className = 'message-frame-content';

    body.appendChild(iframe);

    iframe.src = url;

    nodes.messageScreen.addEventListener('poppage', function popListener() {
      window.URL.revokeObjectURL(url);
      header.innerHTML = body.innerHTML = '';
      body.style.height = 'auto';
      this.removeEventListener('poppage', popListener);
    });

    mail.screens.moveToPage(nodes.messageScreen);

  },
  createHeaderLine: function(key, value) {
    var line = document.createElement('h2');
    line.className = 'message-frame-header-line';

    line.appendChild(document.createElement('span'))
      .textContent = key;

    line.appendChild(document.createElement('strong'))
      .textContent = value;

    return line;

  }
};

var nodes = {},
  loading = [],
  load = function(callback) {
    var fn = function() {
      if (loading.done) return null;

      let i = loading.indexOf(fn);
      i !== -1 && loading.splice(i, 1);

      let result = callback.apply(this, arguments);

      if (!loading.length) {
        loading.done = true;
        let event = new CustomEvent('apploaded');

        document.dispatchEvent(event);
      }
      return result;
    };

    loading.push(fn);

    return fn;
  };

document.addEventListener('DOMContentLoaded', load(function() {
  [
    'account-field',
    'account-bar',
    'folder-title',
    'messages-list',
    'message',
    'main',
    'first-screen',
    'login-form',
    'select-exist-button',
    'mail-screen',
    'pre-mail-selected',
    'pre-select-mail',
    'select-account',
    'select-account-list',
    'message-screen',
    'message-frame'
  ].forEach(function(id) {
    var target = document.getElementById(id);

    if (target) {
      nodes[id.replace(/(?:-)(\w)/g, function(str, p) {
        return (p || '').toUpperCase();
      })] = target;
    }

  });

  let fields = document.querySelectorAll('.field');

  [].forEach.call(fields, function(field) {
    var cleanButton = field.querySelector('.clean-button'),
      input = field.querySelector('input'),
      valueSetter = input.__lookupSetter__('value'),
      valueGetter = input.__lookupGetter__('value'),
      handle = function() {
        if (this.value) {
          cleanButton.style.display = 'block';
        } else {
          cleanButton.style.display = 'none';
        }
        this.dispatchEvent(new CustomEvent('updatevalue'));
      };

      input.addEventListener('input', handle);
      input.addEventListener('overflow', handle);
      handle.call(input);

      cleanButton.addEventListener('click', function() {
        input.value = '';
        handle.call(input);
      });

      input.__defineSetter__('value', function(val) {
        valueSetter.call(this, val);
        handle.call(this);
        return val;
      });

      input.__defineGetter__('value', valueGetter);

  });

  let pages = document.querySelectorAll('.page');

  [].forEach.call(pages, function(page) {
    page.backButton = page.querySelector('.userbar .back-button');

    if (page.backButton) {
      page.backButton.addEventListener('click', function() {
        mail.screens.toPreviousPage();
      });
    }

    page.mainContent = page.querySelector('.main');

  });

}), true);

//this code is commented for reasons to debug in fx without b2g

/*window.addEventListener('localized', load(function() {

  var html = document.documentElement,
    lang = document.mozL10n.language;

  html.setAttribute('lang', lang.code);
  html.setAttribute('dir', lang.direction);

  if (lang.direction === 'rtl') {
    mail.defaultDirection = -mail.defaultDirection;
  }

}));*/

document.addEventListener('apploaded', mail.firstScreen, true);
