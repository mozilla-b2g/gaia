/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * On B2G we cannot directly show the content of about:* pages with access to
 * privileged code. We already have an about:serviceworkers chrome page showing
 * the list of installed service workers on Desktop. Unfortunately we cannot
 * access it from Gaia. To access this information, we need to query the
 * platform from the System app. And to show it we chose to add a new panel
 * inside the existing "Developer" panel in the Settings app. The communication
 * with the Settings app is done via Inter App Communication API.
 *
 * From this panel we will be sending IAC messages to the System app to request
 * the list of registered service workers and to request actions like updating
 * or unregistering them. The System app will proxy this IAC messages to the
 * platform with no modification.
 *
 * The high level picture is the following:
 *
 *      Settings App
 *          |
 *          |- IAC
 *          |
 *      System App
 *          |
 *          |- Chrome/Content events
 *          |
 *        Gecko (ServiceWorkersManager accessed from a B2G dedicated component)
 */

define(function(require) {
  'use strict';

  /**
   * @alias module:developer_service_workers/developer_service_workers
   * @class DeveloperServiceWorkers
   * @returns {DeveloperServiceWorkers}
   */
  var DeveloperServiceWorkers = function() {
    this._elements = {};
  };

  DeveloperServiceWorkers.prototype = {
    /**
     * Initialization.
     *
     * @access public
     * @memberOf DeveloperServiceWorkers.prototype
     * @param  {Object} elements
     */
    init: function(elements) {
      this._elements = elements;
      this.listeners = {};
      this.serviceWorkersCount = 0;
      this.refresh();
    },

    renderServiceWorkerInfo: function(serviceWorkersInfo) {
      var principal = serviceWorkersInfo.principal;
      var scope = serviceWorkersInfo.scope;

      var list = this._elements.serviceWorkersList;

      var fragment = document.createDocumentFragment();

      var div = document.createElement('div');
      div.dataset.scope = scope;

      var header = document.createElement('header');
      var headerContent = document.createElement('h2');
      headerContent.textContent = principal.origin;
      header.appendChild(headerContent);
      div.appendChild(header);

      [{
        l10nId: 'service-worker-scope',
        textContent: serviceWorkersInfo.scope
      }, {
        l10nId: 'service-worker-script-spec',
        textContent: serviceWorkersInfo.scriptSpec
      }, {
        l10nId: 'service-worker-current-worker-url',
        textContent: serviceWorkersInfo.currentWorkerURL
      }, {
        l10nId: 'service-worker-active-cache-name',
        textContent: serviceWorkersInfo.activeCacheName
      }, {
        l10nId: 'service-worker-waiting-cache-name',
        textContent: serviceWorkersInfo.waitingCacheName
      }].forEach(property => {
        var li = document.createElement('li');
        var span = document.createElement('span');
        span.dataset.l10nId = property.l10nId;
        li.appendChild(span);
        var small = document.createElement('small');
        small.textContent = property.textContent;
        li.appendChild(small);
        div.appendChild(li);
      });

      // We store the listeners so we can remove them in case that
      // we unregister the service worker.
      if (!this.listeners[scope]) {
        var self = this;
        this.listeners[scope] = {
          update: function() {
            self.update(scope);
          },
          unregister: function() {
            self.unregister(principal, scope);
          }
        };
      }

      var update = document.createElement('li');
      var updateButton = document.createElement('button');
      updateButton.dataset.l10nId = 'service-worker-update';
      updateButton.addEventListener('click', this.listeners[scope].update);
      update.appendChild(updateButton);
      div.appendChild(update);

      var unregister = document.createElement('li');
      var unregisterButton = document.createElement('button');
      unregisterButton.dataset.l10nId = 'service-worker-unregister';
      unregisterButton.addEventListener('click',
                                        this.listeners[scope].unregister);
      unregister.appendChild(unregisterButton);
      div.appendChild(unregister);

      fragment.appendChild(div);
      list.appendChild(fragment);

      this._elements.serviceWorkersListSection.classList.remove('hidden');
      this._elements.serviceWorkersEmptySection.classList.add('hidden');
    },

    renderNoServiceWorkerInfo: function() {
      this._elements.serviceWorkersListSection.classList.add('hidden');
      this._elements.serviceWorkersEmptySection.classList.remove('hidden');
    },

    connect: function() {
      if (this._port) {
        return Promise.resolve(this._port);
      }

      return new Promise((resolve, reject) => {
        navigator.mozApps.getSelf().onsuccess = event => {
          var app = event.target.result;
          app.connect('about-service-workers').then(ports => {
            if (!ports || !ports.length) {
              return reject();
            }
            this._port = ports[0];
            resolve(this._port);
          }).catch(reject);
        };
      });
    },

    iacRequest: function(request) {
      return new Promise((resolve, reject) => {
        this.connect().then(port => {
          var id = require('shared/uuid')();
          request.id = id;
          port.postMessage(request);
          port.onmessage = event => {
            var message = event.data;
            if (!message || (message.id != id)) {
              return;
            }
            resolve(message.result);
          };
        });
      });
    },

    refresh: function() {
      this.iacRequest({
        name: 'init'
      }).then(result => {
        var registrations = result.registrations;
        if (!result || !result.registrations) {
          this.renderNoServiceWorkerInfo();
          return;
        }

        this.serviceWorkersCount = registrations.length;
        if (!this.serviceWorkersCount) {
          this.renderNoServiceWorkerInfo();
          return;
        }

        this._elements.serviceWorkersList.innerHTML = '';

        for (var i = 0; i < registrations.length; i++) {
          this.renderServiceWorkerInfo(registrations[i]);
        }
      });
    },

    update: function(scope) {
      this.iacRequest({
        name: 'update',
        scope: scope
      }).catch(e => {
        console.error('Could not update service worker ' + e);
      });
    },

    unregister: function(principal, scope) {
      this.iacRequest({
        name: 'unregister',
        principal: principal,
        scope: scope
      }).then(result => {
        if (!result) {
          return;
        }
        this.doUnregister(scope);
      }).catch(e => {
        console.error('Could not unregister service worker ' + e);
      });
    },

    doUnregister: function(scope) {
      var element = document.querySelector('[data-scope="' + scope + '"]');
      if (!element) {
        return;
      }

      element.parentElement.removeChild(element);

      var listeners = this.listeners[scope];
      if (!listeners) {
        return;
      }

      if (listeners.update) {
        window.removeEventListener('click', listeners.update);
      }

      if(listeners.unregister) {
        window.removeEventListener('click', listeners.unregister);
      }

      this.serviceWorkersCount--;
      if (!this.serviceWorkersCount) {
        this.renderNoServiceWorkerInfo();
      }
    }
  };

  return function() {
    return new DeveloperServiceWorkers();
  };
});
