/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const PAGE_TRANSITION_DURATION = 300,
  CACHE_DOM_PAGES = 2,
  DEFAULT_DIRECTION = 1,
  MESSAGES_PER_SCREEN = 5,

  //simple regexp for parse addresses
  R_ADDRESS_PARTS = /^(?:([\w\s]+) )?<(.+)>$/,

  STORE_ACCOUNTS_KEYS = 'mail:accounts',

  ACCOUNT_AUTH = 'mail:auth',

  DEFAULT_FOLDER = 'INBOX',
  DOM_TAGS = [
    'link',
    'script',
    'style',
    'iframe',
    'embed',
    'param',
    'canvas'
  ],
  ORIGIN = window.location.protocol + '//' + window.location.hostname;

var mail = {
  firstScreen: function() {

    const DOMAINS = {},
      R_EMAIL_DOMAIN = /@(.*)$/;

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
      swiped = false,
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
        swiped = false;
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
          swiped = true;
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

      document.addEventListener('swipestart', swipeStart);

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
      mail.accounts.auth(account);
    }


    mail.loadFolder(DEFAULT_FOLDER, function(){
      Transition.effects.scale(nodes.firstScreen, nodes.mailScreen);
      mail.mailScreen();
    });

  },
  loadMessages: function(interval, success, error) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'fakemsgs.json', true);

    xhr.overrideMimeType('text/plain');

    xhr.onload = function(e) {
      try {

        let arr = JSON.parse(xhr.response);

        success && success.call(xhr, 
            arr.slice(0, Math.max(interval, arr.length))
          );

      } catch (e) {
        error && error.call(xhr, e);
        console.log(e);
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


    nodes.mailScreen.mainContent.innerHTML = '';

    mail.folder = {
      name: folder,
      domList: domList,
      map: map,
      unread: 0
    };

    domList.className = 'messages-list';

    mail.loadMessages(MESSAGES_PER_SCREEN * 2, function(arr) {
      arr.forEach(function(message) {
        var domMessage = mail.messageConstructor(message);

        map.set(domMessage, message);

        domList.appendChild(domMessage);

        if (message.unread) {
          mail.folder.unread++;
        }

        mail.setFolderTitle(folder, mail.folder.unread);

      });
    });

    nodes.main.appendChild(domList);

    callback && callback(mail.folder);

  },
  setFolderTitle: function(folder, unread) {
    var title = document.createElement('span');

    folder = folder.toLowerCase().replace(/^\w/, function(w) {
      return w.toUpperCase();
    });

    nodes.folderTitle.innerHTML = '';

    nodes.folderTitle.appendChild(title)
      .textContent = folder;

    if (unread) {
      let count = document.createElement('span');
      count.className = 'folder-unread-count';

      nodes.folderTitle.appendChild(count)
        .textContent = ' (' + unread + ')';

    }

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
      auth: function(account) {

        account = this.get(localStorage[ACCOUNT_AUTH] = account 
          || localStorage[ACCOUNT_AUTH]);

        return account;

      },
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
  makeUnread: function(domMessage) {
    domMessage.classList.add('message-summary-unread');
  },
  makeRead: function(domMessage) {
    domMessage.classList.remove('message-summary-unread');
  },
  messageConstructor: function(data) {
    var message = document.createElement('article'),
      from = data.from.match(R_ADDRESS_PARTS),
      date = new Date(data.date),
      flags = [
        'unread'
      ];

    message.setAttribute('role', 'row');
    message.classList.add('message-summary');

    /* Heaader block */
    let header = message.appendChild(document.createElement('header'));
    header.classList.add('message-summary-header');

    /* Author block*/
    let author = header.appendChild(document.createElement('h1'));
    author.classList.add('message-summary-author');
    author.textContent = from[1] || from[2];

    /* Subject block */
    let subject = header.appendChild(document.createElement('h2'));
    subject.classList.add('message-summary-subject');
    subject.textContent = data.subject;

    /* Date block */
    

    //for ability to run just in browser
    if (document.mozL10n) {
      let relative = DateAPI.getRelativeSince(date);

      if (relative.case === 'format') {

        if (relative.time) {
          relative.time = date.toLocaleFormat(document.mozL10n.get('time'));
        } else if(relative.month) {
          relative.month = document.mozL10n.get('month_' + relative.month);
        }

        date = document.mozL10n.get('format_' + relative.format, relative);

      } else {
        date = document.mozL10n.get('date_' + relative.case, relative);
      }
    }


    let dateBlock = author.appendChild(document.createElement('span'));
    dateBlock.classList.add('message-summary-date');
    dateBlock.textContent = date;

    /* Summary block */
    let summary = message.appendChild(document.createElement('div'));
    summary.classList.add('message-summary-text');
    let text = data.body.slice(0, Math.min(data.body.length, 200))
    summary.textContent = App.cleanTags(App.sanitizeHTML(text));

    if (data.unread) {
      mail.makeUnread(message);
    }

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
      },
      url;

    for (let key in headers) {
      if (headers[key] && Object.prototype.hasOwnProperty.call(headers, key)) {
        header.appendChild(mail.createHeaderLine(key, headers[key]));
      }
    }

    let subject = header.appendChild(document.createElement('h2'));
    subject.className = 'message-frame-subject';
    subject.textContent = message.subject;

    body.style.height = '-moz-calc(100% - ' + header.offsetHeight + 'px)';

    if (message['content-type'] === 'text/html') {

      let html = App.sanitizeHTML(message.body);

      // Pattern from MDN 
      // https://developer.mozilla.org/en/HTML/Canvas/Drawing_DOM_objects_into_a_canvas#Drawing_HTML
      let doc = document.implementation.createHTMLDocument('');

      doc.body.innerHTML = html;

      let replacedNodes = doc.querySelectorAll(DOM_TAGS.join(', '));

      [].forEach.call(replacedNodes, function(node) {
        if (node && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });

      html = doc.body.innerHTML;

      url = window.URL.createObjectURL(
        new Blob([
           '<!DOCTYPE html>',
            '<meta charset="utf-8">',
            html,
            '<script>\n',
            'window.addEventListener("message", function(e) {\n',
              'console.log(e.origin);\n',
            '});\n',
            'var links = document.querySelectorAll("a");\n',
            '[].forEach.call(links, function(link) {\n',
              'link.onclick = function(e) {\n',
                'window.parent.postMessage({messageLink: this.href}, "' + ORIGIN + '");\n',
                'e.preventDefault();\n',
                'return false;\n',
              '};\n',
            '});\n',
            '</script>'
          ], {
          type: 'text\/html'
        })
      );

    } else { 
      // text/plain

      let text = App.escapeHTML(message.body);

      url = window.URL.createObjectURL(
        new Blob([
            '<!DOCTYPE html>',
            //Should be message encoding
            '<meta charset="utf-8">',
            text
          ], {
          type: 'text\/html'
        })
      );

    }
    

    // Has no affect in Gecko :(

    iframe.setAttribute('sandbox', '');

    iframe.className = 'message-frame-content';

    iframe.src = url;

    body.appendChild(iframe);


    nodes.messageScreen.addEventListener('poppage', function popListener() {
      window.URL.revokeObjectURL(url);
      header.innerHTML = body.innerHTML = '';
      body.style.height = 'auto';
      this.removeEventListener('poppage', popListener);
    });

    nodes.mailScreen.addEventListener('pushpage', function pushListener() {

      if (message.unread) {
        message.unread = false;
        mail.makeRead(domMessage);
        mail.folder.unread--;
        mail.setFolderTitle(mail.folder.name, mail.folder.unread);
      }
      
      domMessage.classList.remove('highlight');
      this.removeEventListener('poppage', pushListener);
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

  // Simple pre-load pattern
  // Then all callback are fired, apploaded event will dispatched

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

    callback.boundHandler = fn;

    loading.push(fn);

    return fn;
  };

document.addEventListener('DOMContentLoaded', load(function() {

  // Fetch all IDs from the document to |nodes| object

  let targets = document.querySelectorAll('[id]');

  [].forEach.call(targets, function(target) {

    if (target) {
      nodes[target.id.replace(/(?:-)(\w)/g, function(str, p) {
        return (p || '').toUpperCase();
      })] = target;
    }

  });

  // Featch all specail market textfields and adding
  // new input API

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

  // Select all predefined pages and find in them "back buttons"
  // back buttons uses for return to previous screen

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

window.addEventListener('localized', load(function() {

  if (document.mozL10n) {
    let html = document.documentElement,
      lang = document.mozL10n.language;

    html.setAttribute('lang', lang.code);
    html.setAttribute('dir', lang.direction);

    if (lang.direction === 'rtl') {
      mail.defaultDirection = -mail.defaultDirection;
    }
  }

}));

var handleLoad = function(e){

    if (e.data.message !== 'visibilitychange'
      || e.data.hidden) return;

    let account = mail.accounts.auth();

    if (account) {
      setTimeout(function(){
        mail.loadFolder(DEFAULT_FOLDER, mail.mailScreen);
      }, 1);
    } else {
      mail.firstScreen();
    }

  },
  handleChange = function() {

  };

// Listen outer event |visibilitychange|
window.addEventListener('message', function(e) {
  if (loading.done) {
    handleChange(e);
  } else {
    mail.parentWindow = e.source;
    document.addEventListener('apploaded', function() {
      handleLoad(e);
    });
  }
}, true);

window.addEventListener('message', function(e) {
  if (e.origin === ORIGIN) {

    let url = e.data.messageLink;

    if (!url.indexOf('http:') || !url.indexOf('https:')) {
      mail.parentWindow.postMessage({
        request: window.location.href.replace('email', 'browser').replace(/\/$/, ''),
        params: {
          url: url
        }
      }, '*');
    }
  }
});

 /*setTimeout(function(){
  e.source
}, 1000);*/