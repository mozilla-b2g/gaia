/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const PAGE_TRANSITION_DURATION = 300,
  CACHE_DOM_PAGES = 2,
  DEFAULT_DIRECTION = 1,
  MESSAGES_PER_SCREEN = 5,

  //simple regexp for parse addresses
  R_ADRESS_PARTS = /^(?:([\w\s]+) )?<(.+)>$/,

  STORE_ACCOUNTS_KEYS = 'mail:accounts';

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
      swipeMove = function() {

      },
      swipeEnd = function() {

        swipedTarget = null;
        document.removeEventListener('mousemove', swipeMove);
        document.removeEventListener('swipeend', swipeEnd);

      },
      getMessage = function(target){

        while (!('messageId' in target.dataset)) {

          if ((target = target.parentNode) === nodes.mailScreen) {
            return null;
          };
          
        }

        return target;

      };

    nodes.mailScreen.hidden = false;

    nodes.accountBar
      .appendChild(document.createElement('div'))
      .appendChild(document.createElement('span'))
      .textContent = account;

    nodes.mailScreen.addEventListener('mousedown', function(e) {
      swipedTarget = getMessage(e.target);

      if(!swipedTarget) {
        return;
      }

      let left = e.layerX,
        width = swipedTarget.offsetWidth,
        started = false;

      document.addEventListener('tapstart', function() {
        swipedTarget.classList.add('highlight');
      });

      if (left > width - width / 10) {
        document.addEventListener('swipestart', function listenStart(e) {
          if (e.detail & SWIPE_HORIZONTAL) {
            console.log('swipe');
            document.addEventListener('mousemove', function(e) {
              console.log('move');
              if (!started && left - e.layerX > width / 3) {
                started = true;
              }

              if (started) {

              }
            });
          }
        });
        document.addEventListener('mouseup', function() {

        });
      }

    }, true);

    nodes.main.addEventListener('tapstart', function(e) {
      console.log('tapstart');
    });
    nodes.main.addEventListener('tapend', function(e) {
      console.log('tapend');
    });
    nodes.main.addEventListener('longtapstart', function(e) {
      console.log('longtap');
    });

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


    mail.loadFolder(mail.folder, function() {
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

    var map = mail.folderMessages = new Map();

    mail.loadMessages(MESSAGES_PER_SCREEN * 2, function(arr){
      arr.forEach(function(message){
        var domMessage = mail.messageConstructor(message);

        map.set(domMessage, message)

        nodes.messagesList.appendChild(domMessage);

      });
    });

    callback && callback(folder);

  },
  folder: 'inbox',
  defaultDirection: DEFAULT_DIRECTION,
  folderMessages: null,
  messagesList: (function(){

    var memmoryStack = {};

    return {
      getById: function(){

      },
      updateList: function(){

      },
      clearList: function(){

      }
    };
  }()),
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
      from = data.from.match(R_ADRESS_PARTS),
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
  updatePages: function(page, dir) {
    var tmp,
      pages = mail.pages;

    page || (page = mail.currentPage);
    dir || (dir = mail.defaultDirection);

    if (tmp = pages[page - dir]) {
      tmp.style.display = 'block';
      tmp.style.MozTransform = Transform.translate(
        (window.innerWidth + TRANSITION_PADDING) * dir * -1
      );
    }

    if (tmp = pages[page + dir]) {
      if (!tmp.offsetWidth && !tmp.offsetHeight)
        nodes.messagesList.appendChild(tmp).style.display = 'block';

      tmp.style.MozTransform = Transform.translate(
        (window.innerWidth + TRANSITION_PADDING) * dir
      );
    }
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
    'folder',
    'messages-list',
    'messages',
    'main',
    'first-screen',
    'login-form',
    'select-exist-button',
    'mail-screen',
    'pre-mail-selected',
    'pre-select-mail',
    'select-account',
    'select-account-list'
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

}), true);

/*window.addEventListener('localized', load(function() {

  var html = document.documentElement,
    lang = document.mozL10n.language;

  html.setAttribute('lang', lang.code);
  html.setAttribute('dir', lang.direction);

  if (lang.direction === 'rtl') {
    mail.defaultDirection = -mail.defaultDirection;
  }

}));*/

//document.addEventListener('apploaded', function );

document.addEventListener('apploaded', mail.firstScreen, true);
