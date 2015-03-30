(function() {
  'use strict';

  const SERVER = 'http://inapp-pay-test.paas.allizom.org';
  const TIMEOUT = 5000;
  const DEBUG = true;
  const MAX_RETRIES = 5;

  function toCamelCase(str) {
    return str.replace(/\-(.)/g, (str, p1) => {
      return p1.toUpperCase();
    });
  }

  function fetch(options) {
    return new Promise((resolve, reject) => {
      var req = new XMLHttpRequest({mozSystem: true});
      req.open(options.method, SERVER + options.url, true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.responseType = 'json';
      req.timeout = TIMEOUT;
      req.withCredentials = true;
      req.onload = () => {
        DEBUG && console.log('Response to request', options.url, req.response);
        if (req.status !== 201 && req.status !== 200 && req.status !== 204 &&
            req.status !== 207 && req.status !== 302) {
          reject(req.response);
          return;
        }
        resolve(req.response);
      };

      req.onerror = req.ontimeout = (event) => {
        DEBUG && console.log('Response to request', options.url, 'was an error');
        reject(event.target.status);
      };

      var body;
      if (options.body) {
        body = JSON.stringify(options.body);
      }

      DEBUG && console.log('Request to', options.url, 'with body', body);
      req.send(body);
    });
  }

  function getJWT(server) {
    return fetch({
      method: 'GET',
      url: '/jwt-source?server=' + server + '&_=' + Date.now()
    });
  }

  var App = {
    run: function() {
      ['jwt-input',
       'server',
       'error',
       'jwt',
       'refresh',
       'log',
       'log-content',
       'jwt-panel',
       'jwt-content',
       'pay',
       'toggle'].forEach(id => {
        this[toCamelCase(id)] = document.getElementById(id);
      });

      refresh.addEventListener('click', App.refresh);
      pay.addEventListener('click', App.pay);
      toggle.addEventListener('click', () => {
        if (jwtPanel.classList.contains('hidden')) {
          App.showJwt();
        } else {
          App.showLog();
        }
      });
      server.addEventListener('change', App.refresh);
      App.refresh();
    },

    pay: function() {
      App.clearLog();
      App.showLog();
      App.writeLog('Signing JWT...');
      fetch({
        method: 'POST',
        url: '/pay',
        body: {
          jwt: jwtContent.textContent,
          server: server.value
        }
      }).then((response) => {
        App.writeLog('[Transaction ID] -> ' + response.transID);
        App.writeLog('Calling navigator.mozPay...');
        return new Promise((resolve, reject) => {
          var req = navigator.mozPay([response.jwt]);
          req.onsuccess = () => {
            resolve(response.transID);
          };
          req.onerror = () => {
            reject('Payment canceled ' + req.error.name);
          };
        });
      }).then((transactionID) => {
        App.writeLog('Payment done!');
        App.verifyTransaction(transactionID, 0);
      }).catch((error) => {
        App.writeLog('Oh crap ' + error);
      });
    },

    verifyTransaction: function(transactionID, retries) {
      App.writeLog('Verifying transaction... Retry ' + retries);
      fetch({
        method: 'GET',
        url: '/transaction/' + transactionID
      }).then((response) => {
        if (response.state == 'completed') {
          App.writeLog('Payment verified!');
          return;
        }
        if (retries > MAX_RETRIES) {
          App.writeLog('Payment could not be verified :(');
          return;
        }
        setTimeout(() => {
          App.verifyTransaction(transactionID, retries++);
        }, 1000);
      });
    },

    showLog: function() {
      log.classList.remove('hidden');
      jwtPanel.classList.add('hidden');
      toggle.textContent = 'Show JWT';
    },

    showJwt: function() {
      jwtPanel.classList.remove('hidden');
      log.classList.add('hidden');
      toggle.textContent = 'Show Log';
    },

    writeLog: function(msg) {
      console.log(msg);
      logContent.textContent += '\n' + msg;
    },

    clearLog: function() {
      logContent.textContent = '';
    },

    refresh: function() {
      getJWT(server.value).then((jwt) => {
        jwtContent.textContent = JSON.stringify(jwt);
      }).catch((error) => {
        jwtContent.textContent = 'Error retrieving JWT ' + error;
      });
    }
  };

  window.addEventListener('DOMContentLoaded', App.run);
})();
