/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const MESSAGES_PER_PAGE = 10,
  PAGES_LENGTH = 5,
  TRANSITION_PADDING = 20,
  PAGE_TRANSITION_DURATION = 300,
  CACHE_DOM_PAGES = 2,
  DEFAULT_DIRECTION = 1,

  //simple regexp for parse addresses
  R_ADRESS_PARTS = /^(?:([\w\s]+) )?<(.+)>$/,

  STORE_ACCOUNTS_KEYS = 'mail:accounts';

var mail = {
  firstScreen: function() {

    const DOMAINS = {},
      R_EMAIL_DOMAIN = /@(.*)$/;

    var pages = new Paging(nodes.firstScreen);

    //pages.registerPage(nodes.selectAccount);

    nodes.firstScreen.classList.remove('hidden');

    nodes.selectExistButton.addEventListener('click', function() {
      nodes.selectAccount.style.top = window.innerHeight + 'px';
      nodes.selectAccount.classList.remove('hidden');
      window.addEventListener('MozAfterPaint', function afterPaint() {
        window.removeEventListener('MozAfterPaint', afterPaint);

        Transition.run(nodes.selectAccount, {
          top: 0
        }, {
          duration: 300
        });

      });

      let accounts = mail.accounts.getAll();

      nodes.selectAccountList.innerHTML = '';

      accounts.forEach(function(account) {
        var li = document.createElement('li');
        //li.dataset.index = i;

        li.addEventListener('click', function() {

          account = mail.accounts.get(account);

          if (account) {
            window.removeEventListener('keyup', ESCLitener);
            nodes.firstScreen.classList.add('hidden');
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

      nodes.firstScreen.classList.add('hidden');

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
    var pages = mail.pages,
      currentPage = 0,
      stopTransition = function() {
        for (var i = -1; i < 2; i++) {
          pages[mail.currentPage + i] &&
            Transition.stop(pages[mail.currentPage + i]);
        }
      },
      lastDir = DEFAULT_DIRECTION,
      updatePages = mail.updatePages;

    nodes.mailScreen.classList.remove('hidden');

    nodes.accountBar
      .appendChild(document.createElement('div'))
      .appendChild(document.createElement('span'))
      .textContent = account;

    /*nodes.messages.removeChild(messagePage);

    for(let i = PAGES_LENGTH; i--;){
      pages.push(messagePage.cloneNode(true));
    }*/
    nodes.messages.zIndex = 0;
    pages.forEach(function(page, i) {
      page.style.zIndex = pages.length - i;
      page.style.display = 'none';
    });

    nodes.messages.appendChild(pages[mail.currentPage]).style.display = 'block';

    //updatePages(mail.currentPage - 1);

    window.addEventListener('resize', function() {
      updatePages(mail.currentPage, lastDir);
    }, true);

    var swipeMove = function(e) {
      //if(e.detail === SWIPE_HORIZONTAL){
      var local = e.clientX - swipeStart,
        dir = lastDir = local < 0 ? 1 : -1,
        tmp;

      offset = Math.max(
          Math.min(local, window.innerWidth + TRANSITION_PADDING),
          -window.innerWidth - TRANSITION_PADDING
        );

      var transform = new Transform({
        translate: offset
      });

      pages[mail.currentPage].style.MozTransform = transform;

      if (tmp = pages[mail.currentPage + dir]) {
        tmp.style.MozTransform = new Transform({
          translate: offset + (window.innerWidth + TRANSITION_PADDING) * dir
        });
      }

      if (tmp = pages[mail.currentPage + -dir]) {
        tmp.style.MozTransform = new Transform({
          translate: offset + (window.innerWidth + TRANSITION_PADDING) * -dir
        });
      }

    },
      swipeStart,
      offset = 0,
      swipeEnd = function(e) {
        var dir = (offset < 0 ? 1 : -1) * mail.defaultDirection,
          next = mail.currentPage +
            (Math.abs(offset) > window.innerWidth / 4 ? dir : 0),
          factor = (TRANSITION_PADDING + window.innerWidth - Math.abs(offset)) /
            (window.innerWidth + TRANSITION_PADDING);

        stopTransition();

        Transition.run(pages[next] || pages[mail.currentPage], {
          MozTransform: 'translate(0)'
        }, {
          duration: factor * PAGE_TRANSITION_DURATION
        }, function() {
          updatePages(mail.currentPage, dir);
        });

        if (next !== mail.currentPage && pages[next]) {
          Transition.run(pages[mail.currentPage], {
            MozTransform: Transform.translate(
                (window.innerWidth + TRANSITION_PADDING) * -dir
              )
          }, {
            duration: factor * PAGE_TRANSITION_DURATION
          }, function() {

          });

          let clean = pages[mail.currentPage + CACHE_DOM_PAGES * -dir];
          if (clean && clean.parentNode) {
            clean.parentNode.removeChild(clean);
          }

          mail.currentPage = next;
        } else {
          let tmp = pages[mail.currentPage + dir];
          tmp && Transition.run(tmp, {
            MozTransform: Transform.translate((
              window.innerWidth + TRANSITION_PADDING) * dir
            )
          }, {
            duration: factor * PAGE_TRANSITION_DURATION
          });
        }

        document.removeEventListener('mousemove', swipeMove);
        document.removeEventListener('swipeend', swipeEnd);
      };

    nodes.main.addEventListener('swipestart', function(e) {
      //Transition.stop(pages[currentPage]);
      //console.log(e.detail, SWIPE_HORIZONTAL);
      if (e.detail & SWIPE_HORIZONTAL) {
        stopTransition();
        updatePages(mail.currentPage, lastDir);
        swipeStart = e.clientX;
        pages[mail.currentPage].style.MozTransition = '';
        document.addEventListener('mousemove', swipeMove);
        document.addEventListener('swipeend', swipeEnd);
      }
    });

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


    mail.loadPage(0, function() {
      mail.mailScreen(account);
    });

  },
  loadMessages: function(interval, success, error) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'fakemsgs.json', true);

    xhr.onload = function(e) {
      try {
        success && success.call(xhr, JSON.parse(xhr.response));

      } catch (e) {
        error && error.call(xhr, e);
      }
    };

    xhr.onerror = function(e) {
      error && error.call(xhr, e);
    };

    xhr.send(null);
  },
  loadPage: function(i, callback) {
    mail.loadMessages([i * MESSAGES_PER_PAGE, MESSAGES_PER_PAGE - 1],
      function(messages) {
        if (!Array.isArray(messages)) return;

        let page = document.createElement('div');

        for (let i = 0, len = Math.min(MESSAGES_PER_PAGE, messages.length);
           i < len; i++) {
          page.appendChild(mail.messageConstructor(messages[i]));
        }

        page.classList.add('message-page');
        page.setAttribute('role', 'rowgroup');
        page.style.display = 'none';

        mail.pages[i] = page;
        mail.updatePages();
        callback && callback(page, messages);
    });
  },
  loadFolder: function() {

  },
  folder: 'inbox',
  currentPage: 0,
  pages: [],
  defaultDirection: DEFAULT_DIRECTION,
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
    address.appendChild(document.createElement('span'))
      .textContent = from[1] || from[2];
    address.appendChild(document.createTextNode(', '));
    address.appendChild(document.createElement('span')).textContent = [
      date.getDate(),
      date.getMonth() + 1,
      date.getYear() - 100
    ].join('.').replace(/(^|\.)(\d)(?!\d)($|\.)/g, '$10$2$3');
    let subject = header.appendChild(document.createElement('h2'));
    subject.classList.add('message-summary-subject');
    subject.textContent = data.subject;
    let summary = message.appendChild(document.createElement('div'));
    summary.classList.add('message-summary-text');
    summary.textContent = data.body.slice(0, Math.min(data.body.length, 200));

    message.dataset.index = 0;

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
        nodes.messages.appendChild(tmp).style.display = 'block';

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

//temporary way
//by timer listen when page changes
//and load new from related place

setInterval(function() {
  var tmp;

  if (!mail.pages[tmp = mail.currentPage - 1] && tmp >= 0) {
    mail.loadPage(mail.currentPage - 1);
  }

  if (!mail.pages[tmp = mail.currentPage + 1] && tmp < PAGES_LENGTH) {
    mail.loadPage(mail.currentPage + 1);
  }

}, 100);

document.addEventListener('DOMContentLoaded', load(function() {
  [
    'account-field',
    'account-bar',
    'folder',
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

window.addEventListener('localized', load(function() {

  var html = document.documentElement,
    lang = document.mozL10n.language;

  html.setAttribute('lang', lang.code);
  html.setAttribute('dir', lang.direction);

  if (lang.direction === 'rtl') {
    mail.defaultDirection = -mail.defaultDirection;
  }

}));

//document.addEventListener('apploaded', function );

document.addEventListener('apploaded', mail.firstScreen, true);
