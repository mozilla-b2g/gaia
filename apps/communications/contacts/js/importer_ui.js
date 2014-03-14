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
    var checkNodeList;

    // Existing service contacts
    var existingContacts = [];
    var existingContactsByUid = {};

    var contactsLoaded = false, friendsLoaded = false;

    var currentRequest;
    // Current network request to enable canceling
    var currentNetworkRequest = null;

    var cancelled = false;

    var _ = navigator.mozL10n.get;

    // Indicates whether some friends have been imported or not
    var friendsImported;

    // For synchronization
    var syncOngoing = false;

    var updateButton,
        selectAllButton,
        deSelectAllButton,
        contactList,
        headerElement,
        friendsMsgElement,
        scrollableElement;

    var imgLoader;

    // More than this number will not trigger sync when clicking
    // on "Update Facebook Friends"
    var HARD_LIMIT_SYNC = 300;

    var tokenKey;

    var isOnLine = navigator.onLine;
    var ongoingImport = false;
    var ongoingClean = false;
    var theImporter, theCleaner;

    window.addEventListener('online', onLineChanged);
    window.addEventListener('offline', onLineChanged);

    function notifyParent(message, origin) {
      parent.postMessage({
        type: message.type || '',
        data: message.data || '',
        message: message.message || ''
      }, origin);
    }

    function showOfflineDialog(yesCb, noCb) {
      var recommend = serviceConnector.name === 'facebook';
      var dialog = parent.document.getElementById('confirmation-message');
      parent.LazyLoader.load(dialog, function() {
        navigator.mozL10n.translate(dialog);
        LazyLoader.load('/contacts/js/utilities/confirm.js', function() {
          ConfirmDialog.show(_('connectionLost'), _('connectionLostMsg'),
          {
            title: _('noOption'),
            isRecommend: !recommend,
            callback: function() {
              ConfirmDialog.hide();
              noCb();
            }
          },
          {
            title: _('yesOption'),
            // FB friends can later resync data
            isRecommend: recommend,
            callback: function() {
              ConfirmDialog.hide();
              yesCb();
            }
          }, {
            zIndex: '10000'
          });
        });
      });
    }

    function onLineChanged() {
      isOnLine = navigator.onLine;
      if (isOnLine === false && ongoingImport) {
        theImporter.hold();

        showOfflineDialog(function() {
          theImporter.resume();
        }, function() {
            // Finish the import process consistently
            theImporter.finish();
        });
      }
    }

    function getTokenKey() {
      var key = 'tokenData';
      var serviceName = serviceConnector.name;

      if (serviceName !== 'facebook') {
        key += ('_' + serviceName);
      }

      return key;
    }

    // Define a source adapter object to pass to contacts.Search.
    //
    // Since multiple, separate apps use contacts.Search its important for
    // the search code to function independently.  This adapter object allows
    // the search module to access the app's contacts without knowing anything
    // about our DOM structure.
    var searchSource = {
      getNodes: function() {
        return contactList.querySelectorAll('section > ol > li');
      },
      getFirstNode: function() {
        return contactList.querySelector('section > ol > li');
      },
      getNextNode: function(contact) {
        var out = contact.nextElementSibling;
        var nextParent = contact.parentNode.parentNode.nextElementSibling;
        while (!out && nextParent) {
          out = nextParent.querySelector('ol > li:first-child');
          nextParent = nextParent.nextElementSibling;
        }
        return out;
      },
      expectMoreNodes: function() {
        // This app does not lazy load contacts into search via the
        // appendNodes() function, so always return false.
        return false;
      },
      clone: function(node) {
        return node.cloneNode(true);
      },
      getNodeById: function(id) {
        return contactList.querySelector('[data-uuid="' + id + '"]');
      },
      getSearchText: function(node) {
        return node.dataset.search;
      },
      click: onSearchResultCb
    }; // searchSource

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
      contacts.Search.init(searchSource, true);
    };

    function notifyLogout() {
       // Simulating logout finished to enable seamless closing of the iframe
      var msg = {
        type: 'logout_finished',
        data: ''
      };
      parent.postMessage(msg, targetApp);
    }

    UI.end = function(event) {
      notifyParent({
        type: 'window_close'
      }, targetApp);
      // uncomment this to make it work on B2G-Desktop
      // parent.postMessage(msg, '*');

      notifyLogout();
    };

    function removeToken(cb) {
      var theCb = (typeof cb === 'function') ? cb : function() {};
      window.asyncStorage.removeItem(tokenKey, theCb, theCb);
    }

    function markPendingLogout(url, service, cb) {
      var PENDING_LOGOUT_KEY = 'pendingLogout';
      window.asyncStorage.getItem(PENDING_LOGOUT_KEY,
          function(data) {
            var obj = data || {};
            obj[service] = url;
            var theCb = (typeof cb === 'function') ? cb : function() {};
            window.asyncStorage.setItem(PENDING_LOGOUT_KEY, obj, theCb, theCb);
          });
    }

    function serviceLogout(cb) {
      if (serviceConnector.automaticLogout) {
        var serviceName = serviceConnector.name;
        var logoutUrl = oauthflow.params[serviceName].logoutUrl;

        var callbacks = {
          error: function() {
            window.console.warn('Error while logging out user ', logoutUrl);
            removeToken();
            markPendingLogout(logoutUrl, serviceName, cb);
          },
          timeout: function() {
            window.console.warn('Timeout while logging out user ', url);
            removeToken();
            markPendingLogout(logoutUrl, serviceName, cb);
          },
          success: function() {
            window.console.log('Successfully logged out');
            removeToken(cb);
          }
        };

        // Prevent false logout positives
        if (navigator.onLine === true) {
          Rest.get(logoutUrl, callbacks);
        }
        else {
          removeToken();
          markPendingLogout(logoutUrl, serviceName, cb);
        }
      }
      else {
        cb();
      }
    }

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

      UI.selection({
        target: realNode
      });
    }

    // Function used by unit tests to reset the state of the module
    Importer.reset = function() {
      selectedContacts = {};
      unSelectedContacts = {};
      selectableFriends = {};

      myFriends = []; myFriendsByUid = {};

      checked = 0;

      // Existing service contacts
      existingContacts = [];
      existingContactsByUid = {};

      contactsLoaded = false;
      friendsLoaded = false;

      currentRequest = null;
      currentNetworkRequest = null;

      friendsImported = false;
      syncOngoing = false;

      ongoingImport = ongoingClean = false;

      selectAllButton = document.getElementById('select-all');
      deSelectAllButton = document.getElementById('deselect-all');
    };

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
      var totalExisting = existingContacts.length;
      if (totalExisting > 0 && totalExisting < HARD_LIMIT_SYNC &&
          !syncOngoing) {
        syncOngoing = true;

        serviceConnector.startSync(existingContacts, myFriendsByUid,
                                   syncSuccess);
      }
      else {
        // Automatically notify sync finished
        var msg = {
          type: 'sync_finished',
          data: 0
        };
        parent.postMessage(msg, targetApp);
      }
    }


    /**
     *  Invoked when friends are ready
     *
     */
    function friendsAvailable() {
      imgLoader = new ImageLoader('#mainContent',
                                ".block-item:not([data-uuid='#uid#'])");

      var s = '.block-item:not([data-uuid="#uid#"]) input[type="checkbox"]';
      checkNodeList = contactList.querySelectorAll(s);
      Array.prototype.slice.call(checkNodeList, 0, checkNodeList.length);

      friendsLoaded = true;

      if (contactsLoaded) {
        window.addEventListener('message', function importOnViewPort(e) {
          if (e.origin !== targetApp) {
            return;
          }
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

        var totalMyFriends = lmyFriends.length;
        for (var i = 0; i < totalMyFriends; i++) {
          var aFriend = lmyFriends[i];
          aFriend._idxFriendsArray = i;
          myFriends.push(serviceConnector.adaptDataForShowing(aFriend));

          myFriendsByUid[aFriend.uid] = aFriend;
          selectableFriends[aFriend.uid] = aFriend;
        }

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
        if (!tokenExpired(response.error)) {
          setCurtainHandlersErrorFriends();
          Curtain.show('error', 'friends');
        }
        else {
          // There was a problem with the access token
          window.console.warn('Access Token expired or revoked');
          Curtain.hide(notifyParent.bind(null, {
            type: 'token_error'
          }, targetApp));
          window.asyncStorage.removeItem(tokenKey,
            function token_removed() {
              oauth2.getAccessToken(function(new_acc_tk) {
                access_token = new_acc_tk;
                Importer.getFriends(new_acc_tk);
              }, 'friends', serviceConnector.name);
          });
        } // else
      } // else
    };

    function cancelImport() {
      cancelled = true;

      var cancelFunc = onUpdate;
      if (ongoingImport) {
        cancelFunc = theImporter.finish;
      } else if (ongoingClean) {
        cancelFunc = theCleaner.finish;
      }

      cancelFunc();
      Curtain.show('message', 'canceling');
    }

    function cancelCb() {
      if (currentNetworkRequest) {
         currentNetworkRequest.cancel();
         currentNetworkRequest = null;
      }
      Curtain.hide(notifyParent.bind(null, {
        type: 'abort'
      }, targetApp));
    }

    function setCurtainHandlersErrorFriends() {
      Curtain.oncancel = function friends_cancel() {
        Curtain.hide(notifyParent.bind(null, {
          type: 'abort'
        }, targetApp));
      };

      Curtain.onretry = function get_friends() {
        Curtain.oncancel = cancelCb;
        Curtain.show('wait', 'friends');

        Importer.getFriends(access_token);
      };
    }

    function checkUpdateButton() {
      // Update button
      if (Object.keys(selectedContacts).length > 0 ||
          Object.keys(unSelectedContacts).length > 0) {
        updateButton.disabled = false;
      } else {
        // Empty arrays implies to disable update button
        updateButton.disabled = true;
      }
    }

    function checkDisabledButtons() {
      checkUpdateButton();

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
      // If the service requires to do the logout it is done
      serviceLogout(notifyLogout);

      if (Importer.getContext() === 'ftu') {
        Curtain.hide(notifyParent.bind(null, {
          type: 'window_close',
          message: cancelled ? null : _('friendsUpdated', {
            numFriends: numFriends
          })
        }, targetApp));
      } else {
        notifyParent({
          type: 'import_updated'
        }, targetApp);
        window.addEventListener('message', function finished(e) {
          if (e.origin !== targetApp) {
            return;
          }
          if (e.data.type === 'contacts_loaded') {
            // When the list of contacts is loaded and it's the current view
            Curtain.hide(notifyParent.bind(null, {
              type: 'window_close',
              message: cancelled ? null :
              _('friendsUpdated', {
                numFriends: numFriends
              })
            }, targetApp));
            window.removeEventListener('message', finished);
          }
        });
      }
    }

    function cleanContacts(onsuccess, progress) {
      if (cancelled) {
        return;
      }

      var contacts = [];
      var unSelectedKeys = Object.keys(unSelectedContacts);
      unSelectedKeys.forEach(function iterator(uid) {
        var deviceContacts = unSelectedContacts[uid];
        for (var i = 0; i < deviceContacts.length; i++) {
          contacts.push(deviceContacts[i]);
        }
      });

      // To optimize if the user wishes to unselect all
      var mode = 'update';
      if (unSelectedKeys.length === existingContacts.length &&
          Object.keys(selectedContacts).length === 0) {
        mode = 'clear';
        Curtain.hideMenu(); // User cannot cancel cleaning all the friends
      }

      serviceConnector.cleanContacts(contacts, mode,
          function gotCleaner(cleaner) {
            if (cleaner) {
              theCleaner = cleaner;
              ongoingClean = true;
              cleaner.oncleaned = progress.update;
              cleaner.onsuccess = function() {
                ongoingClean = false;
                theCleaner = null;
                onsuccess();
              };
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
      imgLoader.unload(); // Removing listeners
      var selected = Object.keys(selectedContacts).length;
      var unSelected = getTotalUnselected();
      var total = selected + unSelected;

      cancelled = false;
      if (selected > 0) {
        var progress = Curtain.show('progress', 'import');
        progress.setTotal(total);

        Curtain.oncancel = cancelImport;
        Importer.importAll(function on_all_imported(totalImported) {
          if (typeof serviceConnector.oncontactsimported === 'function') {
            // Check whether we need to set the last update and schedule next
            // sync. Only in that case otherwise that will be done by the sync
            // process
            serviceConnector.oncontactsimported(existingContacts,
                                                friendsImported, function() {
              friendsImported = true;
            });
          }
          if (!cancelled && unSelected > 0) {
            progress.setFrom('update');
            cleanContacts(function callback() {
              onUpdate(progress.getValue());
            }, progress);
          } else {
            onUpdate(progress.getValue());
          }
        }, progress);
      } else if (unSelected > 0) {
        var progress = Curtain.show('progress', 'update');
        progress.setTotal(total);
        Curtain.oncancel = cancelImport;
        cleanContacts(function callback() {
          onUpdate(progress.getValue());
        }, progress);
      }
    };

    /**
     *  Invoked when the user selects all his friends
     *
     *
     */
    UI.selectAll = function(e) {
      deSelectAllButton.disabled = false;
      selectAllButton.disabled = true;

      window.setTimeout(function doSelectAll() {
        bulkSelection(true);

        unSelectedContacts = {};
        selectedContacts = {};

        for (var uid in selectableFriends) {
          selectedContacts[uid] = selectableFriends[uid];
        }

        checkUpdateButton();
      }, 0);

      return false;
    };

    /**
     *  Invoked when the user unselects all her contacts
     *
     */
    UI.unSelectAll = function(e)  {
      deSelectAllButton.disabled = true;
      selectAllButton.disabled = false;

      window.setTimeout(function doUnSelectAll() {
        bulkSelection(false);

        selectedContacts = {};
        unSelectedContacts = {};
        for (var uid in existingContactsByUid) {
          unSelectedContacts[uid] = existingContactsByUid[uid];
        }

        checkUpdateButton();
      }, 0);

      return false;
    };

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      var template = contactList.querySelector('[data-template]');

      utils.dom.removeChildNodes(contactList);
      contactList.appendChild(template);
    }

    /**
     *  Makes a bulk selection of the contacts
     *
     *
     */
    function bulkSelection(value) {
      window.setTimeout(function() {
        doSelect(value, checkNodeList, 0, 10);
      }, 0);
    }

    function doSelect(value, list, from, chunkSize) {
      var total = list.length;

      for (var j = from; j < from + chunkSize && j < total; j++) {
        setChecked(list[j], value);
      }

      var leftInterval = from + chunkSize;
      var rightInterval = leftInterval + chunkSize < total ?
                                              leftInterval + chunkSize : total;

      window.setTimeout(function() {
        doSelect(value, list, leftInterval, rightInterval);
      }, 0);
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

    // Release objects for improving memory management
    function releaseObjs(cfdata) {
      if (!cfdata) {
        return;
      }

      // Once a Friend has been persisted the data is no longer needed
      selectedContacts[cfdata.uid] = null;
      myFriendsByUid[cfdata.uid] = null;
      selectableFriends[cfdata.uid] = null;
      myFriends[cfdata._idxFriendsArray] = null;
      if (cfdata.fbInfo && Array.isArray(cfdata.fbInfo.photo)) {
        cfdata.fbInfo.photo = null;
      }
    }

    function doImportAll(importedCB, progress) {
      if (cancelled) {
        return;
      }

      checkNodeList = null;
      var toBeImported = Object.keys(selectedContacts);
      var numFriends = toBeImported.length;

      theImporter = serviceConnector.getImporter(selectedContacts,
                                                   access_token);
      var cpuLock, screenLock;

      theImporter.oncontactimported = function(cfdata) {
        releaseObjs(cfdata);
        progress.update();
      };

      theImporter.onsuccess = function(totalImported) {
        ongoingImport = false;
        window.setTimeout(function imported() {
          window.importUtils.setTimestamp(serviceConnector.name);
          importedCB(totalImported);
        }, 0);

        if (cpuLock) {
          cpuLock.unlock();
        }

        if (screenLock) {
          screenLock.unlock();
        }
      };

      cpuLock = navigator.requestWakeLock('cpu');
      screenLock = navigator.requestWakeLock('screen');
      // Release the DOM these objects will no longer be needed
      document.querySelector('#groups-list').innerHTML = '';

      ongoingImport = true;
      theImporter.start();
    }

    /**
     *  Imports all the selected contacts on the address book
     *
     */
    Importer.importAll = function(importedCB, progress) {
      if (isOnLine === true) {
        doImportAll(importedCB, progress);
      }
      else {
        window.console.warn('User is not online!!');
        showOfflineDialog(function() {
          doImportAll(importedCB, progress);
        }, function() {
          Curtain.hide(UI.end);
        });
      }
    };

  })(document);
}
