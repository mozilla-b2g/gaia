'use strict';

if (typeof window.importer === 'undefined') {
  (function(document) {

    var Importer = window.importer = {};
    var UI = Importer.ui = {};

    var TOKEN_EXPIRED_STR = 'request_token_expired';
    var TOKEN_EXPIRED_CODE = 190;

    // Connector to the external service
    var serviceConnector;
    // target app which will receive all messages from the importer
    var targetApp;

    var access_token;

    var startCallback;

    // External service contacts (aka friends) selected to be sync
    // to the address book
    var selectedContacts = {};

    // Device contacts to be unselected (will be removed from the Addr Book)
    var unSelectedContacts = {};

    // Contacts that are suitable to be selected
    var selectableFriends = {};

    // The whole list of friends as an array
    var myFriends, myFriendsByUid;

    // Counter for checked list items
    var checked = 0;

    // Existing service contacts
    var existingContacts = [];
    var existingContactsByUid = {};

    var contactsLoaded = false, friendsLoaded = false;

    var currentRequest;
    // Current network request to enable canceling
    var currentNetworkRequest = null;

    var _ = navigator.mozL10n.get;

    // Indicates whether some friends have been imported or not
    var friendsImported;

    // For synchronization
    var syncOngoing = false;
    var nextUpdateTime;

    var updateButton,
        selectAllButton,
        deSelectAllButton,
        contactList,
        headerElement,
        friendsMsgElement,
        scrollableElement;

    var imgLoader;

    var tokenKey;

    function getTokenKey() {
      var key = 'tokenData';
      var serviceName = serviceConnector.name;

      if (serviceName !== 'facebook') {
        key += ('_' + serviceName);
      }

      return key;
    }

    UI.init = function() {
      var overlay = document.querySelector('nav[data-type="scrollbar"] p');
      var jumper = document.querySelector('nav[data-type="scrollbar"] ol');

      updateButton = document.getElementById('import-action');
      selectAllButton = document.querySelector('#select-all');
      deSelectAllButton = document.querySelector('#deselect-all');
      contactList = document.querySelector('#groups-list');

      headerElement = document.querySelector('header');
      friendsMsgElement = document.querySelector('#friends-msg');
      scrollableElement = document.querySelector('#mainContent');

      var params = {
        overlay: overlay,
        jumper: jumper,
        groupSelector: '#group-',
        scrollToCb: scrollToCb
      };

      utils.alphaScroll.init(params);
      contacts.Search.init(document.getElementById('content'), null,
                           onSearchResultCb, true);
    };

    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, targetApp);
      // uncomment this to make it work on B2G-Desktop
      // parent.postMessage(msg, '*');
    };

    function tokenExpired(error) {
      return (error.code === TOKEN_EXPIRED_CODE || error === TOKEN_EXPIRED_STR);
    }

    function scrollToCb(groupContainer) {
      scrollableElement.scrollTop = groupContainer.offsetTop;
    }

    function onSearchResultCb(e) {
      var target = e.target;
      var uid = target.dataset.uuid;
      var checkbox = target.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;

      var realNode = contactList.querySelector(
                          '[data-uuid=' + '"' + uid + '"' + ']');
      var realCheckbox = realNode.querySelector('input[type="checkbox"]');

      UI.selection({
        target: realNode
      });
    }

    /**
     *  This function is invoked when a token is ready to be used
     *
     */
    Importer.start = function(acc_tk, connector, ptargetApp, startCb) {
      startCallback = startCb;

      var serviceName = connector.name;

      // Setting UI title
      document.querySelector('#content h1').textContent =
                                          _(serviceName + '-serviceName');
      document.body.classList.add(serviceName);

      serviceConnector = connector;
      targetApp = ptargetApp;
      tokenKey = getTokenKey();

      setCurtainHandlers();

      if (acc_tk) {
        access_token = acc_tk;
        Importer.getFriends(acc_tk);
      }
      else {
        oauth2.getAccessToken(function(new_acc_tk) {
          access_token = new_acc_tk;
          Importer.getFriends(new_acc_tk);
        }, 'friends', serviceConnector.name);
      }
    };

    /**
     *  Invoked when the existing service contacts on the Address Book are ready
     *
     */
    function contactsReady(result) {
      existingContacts = result;
      contactsLoaded = true;

      if (friendsLoaded) {
        markExisting(existingContacts);
      }
    }

     // Callback executed when a synchronization has finished successfully
    function syncSuccess(numChanged) {
      window.console.log('Synchronization ended!!!');
      syncOngoing = false;

      serviceConnector.scheduleNextSync();
      var msg = {
        type: 'sync_finished',
        data: numChanged || ''
      };
      parent.postMessage(msg, targetApp);
    }

    // Starts a synchronization
    function startSync() {
      if (existingContacts.length > 0 && !syncOngoing) {
        syncOngoing = true;

        serviceConnector.startSync(existingContacts, myFriendsByUid,
                                   syncSuccess);
      }
    }


    /**
     *  Invoked when friends are ready
     *
     */
    function friendsAvailable() {
      FixedHeader.init('#mainContent', '#fixed-container',
                     '.import-list header, .fb-import-list header');

      imgLoader = new ImageLoader('#mainContent',
                                ".block-item:not([data-uuid='#uid#'])");

      friendsLoaded = true;

      if (contactsLoaded) {
        window.addEventListener('message', function importOnViewPort(e) {
          var data = e.data;
          if (data && data.type === 'dom_transition_end') {
            window.removeEventListener('message', importOnViewPort);
            window.setTimeout(startSync, 0);
          }
        });
        markExisting(existingContacts);
      }

      Curtain.hide(sendReadyEvent);

      // Only for unit testing purposes
      if (typeof startCallback === 'function') {
        window.setTimeout(startCallback, 0);
      }
    }

    function sendReadyEvent() {
      parent.postMessage({
        type: 'ready', data: ''
      }, targetApp);
    }

    /**
     *  Existing contacts are disabled
     *
     */
    function markExisting(deviceFriends) {
      updateButton.textContent = deviceFriends.length === 0 ? _('import') :
                                                              _('update');

      deviceFriends.forEach(function(fbContact) {
        var uid = serviceConnector.getContactUid(fbContact);
        // We are updating those friends that are potentially selectable
        delete selectableFriends[uid];
        var ele = document.querySelector('[data-uuid="' + uid + '"]');
        // This check is needed as there might be existing FB Contacts that
        // are no longer friends
        if (ele) {
          setChecked(ele.querySelector('input[type="checkbox"]'), true);
        }
        if (existingContactsByUid[uid]) {
          existingContactsByUid[uid].push(fbContact);
        } else {
          existingContactsByUid[uid] = [fbContact];
        }
      });

      var newValue = myFriends.length -
                        Object.keys(existingContactsByUid).length;
      friendsMsgElement.textContent = _('fbFriendsFound', {
        numFriends: newValue
      });

      checkDisabledButtons();
    }

    // Only needed for testing purposes
    Importer.setSelected = function(friends) {
      selectedContacts = friends;
    };

    function setCurtainHandlers() {
      Curtain.oncancel = cancelCb;
    }

    /**
     *  Gets the friends by invoking Graph API
     *
     */
    Importer.getFriends = function(acc_tk) {
      currentNetworkRequest = serviceConnector.listAllContacts(acc_tk, {
        success: importer.friendsReady,
        error: importer.errorHandler,
        timeout: importer.timeoutHandler
      });

      // In the meantime we obtain the Service Contacts
      // already on the Address Book
      if (!navigator.mozContacts) {
        return;
      }

      var callbacks = {
        success: contactsReady,
        error: function(errorName) {
          window.console.error('Error while retrieving existing dev contacts: ',
                               errorName);
        }
      };

      serviceConnector.listDeviceContacts(callbacks);

    };

    function friendImportTimeout() {
      if (currentRequest) {
        window.setTimeout(currentRequest.ontimeout, 0);
      }
    }

    function friendImportError(e) {
      currentRequest.failed(e);
    }


    /**
     *  Callback invoked when friends are ready to be used
     *
     *
     */
    Importer.friendsReady = function(response) {
      if (typeof response.error === 'undefined') {
        var lmyFriends = response.data;
        // Notifying the connector
        if (typeof serviceConnector.oncontactsloaded === 'function') {
          serviceConnector.oncontactsloaded(lmyFriends);
        }

        myFriendsByUid = {};
        myFriends = [];

        lmyFriends.forEach(function(f) {
          myFriends.push(serviceConnector.adaptDataForShowing(f));

          myFriendsByUid[f.uid] = f;
          selectableFriends[f.uid] = f;
        });

        asyncStorage.getItem('order.lastname', function orderValue(lastName) {
          var options = {
            container: '#groups-list',
            orderBy: lastName ? 'lastName' : 'firstName'
          };

          FriendListRenderer.render(myFriends, friendsAvailable, options);
        });
      }
      else {
        window.console.error('Error, while retrieving friends',
                                                    response.error.message);
        if (!tokenExpired(error)) {
          setCurtainHandlersErrorFriends();
          Curtain.show('error', 'friends');
        }
        else {
          // There was a problem with the access token
          Curtain.hide();
          window.asyncStorage.removeItem(tokenKey,
            function token_removed() {
              Importer.start();
              parent.postMessage({
                type: 'token_error',
                data: ''
              },targetApp);
          });
        } // else
      } // else
    };

    function cancelCb() {
      if (currentNetworkRequest) {
         currentNetworkRequest.cancel();
         currentNetworkRequest = null;
      }

      Curtain.hide();

      parent.postMessage({
            type: 'abort',
            data: ''
      }, targetApp);
    }

    function setCurtainHandlersErrorFriends() {
      Curtain.oncancel = function friends_cancel() {
          Curtain.hide();

          parent.postMessage({
            type: 'abort',
            data: ''
          }, targetApp);
        };

      Curtain.onretry = function get_friends() {
        Curtain.oncancel = cancelCb;
        Curtain.show('wait', 'friends');

        Importer.getFriends(access_token);
      };
    }

    function checkDisabledButtons() {
      // Update button
      if (Object.keys(selectedContacts).length > 0 ||
          Object.keys(unSelectedContacts).length > 0) {
        updateButton.disabled = false;
      } else {
        // Empty arrays implies to disable update button
        updateButton.disabled = true;
      }

      switch (checked) {
        case 0:
          // No checked contacts -> De-select all disabled
          deSelectAllButton.disabled = true;
          selectAllButton.disabled = false;
          break;

        case myFriends.length:
          // All checked contacts -> Select all disabled
          selectAllButton.disabled = true;
          deSelectAllButton.disabled = false;
          break;

        default:
          deSelectAllButton.disabled = false;
          selectAllButton.disabled = false;
          break;
      }
    }

    function setChecked(element, value) {
      if (element.checked !== value) {
        // We have to take into account the action whether the value changes
        value ? ++checked : --checked;
      }
      element.checked = value;
    }

    // Error / timeout handler
    Importer.baseHandler = function(type) {
      setCurtainHandlersErrorFriends();
      Curtain.show(type, 'friends');
    };

    Importer.timeoutHandler = function() {
      Importer.baseHandler('timeout');
    };

    Importer.errorHandler = function() {
      Importer.baseHandler('error');
    };

    /**
     *  This function is invoked when importing and updating operations
     *  finished
     */
    function onUpdate(numFriends) {
      function notifyParent(numFriends) {
        parent.postMessage({
          type: 'window_close',
          data: '',
          message: _('friendsUpdated', {
            numFriends: numFriends
          })
        }, targetApp);
      }

      if (Importer.getContext() === 'ftu') {
        Curtain.hide(function onhide() {
          notifyParent(numFriends);
        });
      } else {
        parent.postMessage({
          type: 'import_updated',
          data: ''
        }, targetApp);

        window.addEventListener('message', function finished(e) {
          if (e.data.type === 'contacts_loaded') {
            // When the list of contacts is loaded and it's the current view
            Curtain.hide(function onhide() {
              // Please close me and display the number of friends updated
              notifyParent(numFriends);
            });
            window.removeEventListener('message', finished);
          }
        });
      }
    }

    function cleanContacts(onsuccess, progress) {
      window.console.log('On clean contacts');

      var contacts = [];
      var unSelectedKeys = Object.keys(unSelectedContacts);
      // ContactsCleaner expects an Array object
      unSelectedKeys.forEach(function iterator(uid) {
        var deviceContacts = unSelectedContacts[uid];
        for (var i = 0; i < deviceContacts.length; i++) {
          contacts.push(deviceContacts[i]);
        }
      });

      // To optimize if the user wishes to unselect all
      var mode = 'update';
      if (unSelectedKeys.length === existingContacts.length) {
        mode = 'clear';
      }

      serviceConnector.cleanContacts(contacts, mode,
          function gotCleaner(cleaner) {
            if (cleaner) {
              cleaner.oncleaned = progress.update;
              cleaner.onsuccess = onsuccess;
            }
            else {
              Importer.errorHandler();
            }
      });
    } // clean

    function getTotalUnselected() {
      var total = 0;

      Object.keys(unSelectedContacts).forEach(function surfing(uid) {
        total = total + unSelectedContacts[uid].length;
      });

      return total;
    }

    /**
     *  This function is invoked when an import or update is launched
     *
     */
    UI.importAll = function(e) {
      var selected = Object.keys(selectedContacts).length;
      var unSelected = getTotalUnselected();
      var total = selected + unSelected;

      if (selected > 0) {
        var progress = Curtain.show('progress', 'import');
        progress.setTotal(total);

        Importer.importAll(function on_all_imported() {
          if (typeof serviceConnector.oncontactsimported === 'function') {
            // Check whether we need to set the last update and schedule next
            // sync. Only in that case otherwise that will be done by the sync
            // process
            serviceConnector.oncontactsimported(existingContacts,
                                                friendsImported, function() {
              friendsImported = true;
            });
          }
          if (unSelected > 0) {
            progress.setFrom('update');
            cleanContacts(function callback() {
              onUpdate(total);
            }, progress);
          } else {
            onUpdate(total);
          }
        }, progress);
      } else if (unSelected > 0) {
        var progress = Curtain.show('progress', 'update');
        progress.setTotal(total);
        cleanContacts(function callback() {
          onUpdate(total);
        }, progress);
      }
    };

    /**
     *  Invoked when the user selects all his friends
     *
     *
     */
    UI.selectAll = function(e) {
      bulkSelection(true);

      unSelectedContacts = {};
      selectedContacts = {};
      for (var uid in selectableFriends) {
        selectedContacts[uid] = selectableFriends[uid];
      }

      checkDisabledButtons();

      return false;
    };

    /**
     *  Invoked when the user unselects all her contacts
     *
     */
    UI.unSelectAll = function(e)  {
      bulkSelection(false);

      selectedContacts = {};
      unSelectedContacts = {};
      for (var uid in existingContactsByUid) {
        unSelectedContacts[uid] = existingContactsByUid[uid];
      }

      checkDisabledButtons();

      return false;
    };

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      var template = contactList.querySelector('[data-template]');

      contactList.innerHTML = '';
      contactList.appendChild(template);
    }

    /**
     *  Makes a bulk selection of the contacts
     *
     *
     */
    function bulkSelection(value) {
      var list = contactList.
                  querySelectorAll('.block-item:not([data-uuid="#uid#"]');

      var total = list.length;
      for (var c = 0; c < total; c++) {
        setChecked(list[c].querySelector('input[type="checkbox"]'), value);
      }
    }

    /**
     *   Invoked when an element in the friend list is selected
     *
     */
    UI.selection = function(e) {
      var out = false;
      var target = e.target;

      if (target && target.dataset.uuid) {
        var uuid = target.dataset.uuid;

        var checkbox = target.querySelector('input[type="checkbox"]');
        setChecked(checkbox, !checkbox.checked);

        if (checkbox.checked === true) {
          if (unSelectedContacts[uuid]) {
            delete unSelectedContacts[uuid];
          } else {
            selectedContacts[uuid] = myFriendsByUid[uuid];
          }
        } else {
          delete selectedContacts[uuid];
          // If this was an already imported friend it is added to unselect
          if (existingContactsByUid[uuid]) {
            unSelectedContacts[uuid] = existingContactsByUid[uuid];
          }
        }

        checkDisabledButtons();

        out = true;
      }

      return out;
    };

    Importer.getContext = function() {
      var out = 'contacts';

      if (window.location.search.indexOf('ftu') !== -1) {
        out = 'ftu';
      }

      return out;
    };

    /**
     *  Imports all the selected contacts on the address book
     *
     */
    Importer.importAll = function(importedCB, progress) {
      var toBeImported = Object.keys(selectedContacts);
      var numFriends = toBeImported.length;

      var cImporter = serviceConnector.getImporter(selectedContacts,
                                                   access_token);

      cImporter.oncontactimported = function() {
        progress.update();
      };

      cImporter.onsuccess = function() {
        importedCB();
      };

      cImporter.start();
    };

  })(document);
}
