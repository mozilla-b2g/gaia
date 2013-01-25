'use strict';

var fb = window.fb || {};

if (typeof fb.importer === 'undefined') {
  (function(document) {

    var Importer = fb.importer = {};
    var UI = Importer.ui = {};

    var access_token;

    // FB friends selected to be sync to the address book (facebook friends)
    var selectedContacts = {};

    // Device contacts to be unselected (will be removed from the Addr Book)
    var unSelectedContacts = {};

    // FB friends that are suitable to be selected
    var selectableFriends = {};

    // The whole list of friends as an array
    var myFriends, myFriendsByUid;

    // Counter for checked list items
    var checked = 0;

    // Existing FB contacts
    var existingFbContacts = [];
    var existingFbContactsByUid = {};

    var contactsLoaded = false, friendsLoaded = false;

    var currentRequest;
    // Current network request to enable canceling
    var currentNetworkRequest = null;

    var _ = navigator.mozL10n.get;

    var syncOngoing = false;
    var nextUpdateTime;
    // Indicates whether some friends have been imported or not
    var friendsImported;

    var STATUS_TIME = 2000;
    var statusMsg = document.querySelector('#statusMsg');

    // Query that retrieves the information about friends
    var FRIENDS_QUERY = [
      'SELECT uid, name, first_name, last_name, pic_big, current_location, ' ,
      'middle_name, birthday_date, email, profile_update_time, ' ,
      ' work, education, phones, hometown_location' ,
      ' FROM user' ,
      ' WHERE uid ',
      'IN (SELECT uid1 FROM friend WHERE uid2=me())' ,
      ' ORDER BY last_name'
    ];

    var UID_FILTER_IDX = 5;

    var friendsQueryStr = FRIENDS_QUERY.join('');

    var updateButton = document.getElementById('import-action');
    var selectAllButton = document.querySelector('#select-all');
    var deSelectAllButton = document.querySelector('#deselect-all');
    var contactList = document.querySelector('#groups-list');

    var headerElement = document.querySelector('header');
    var friendsMsgElement = document.querySelector('#friends-msg');
    var scrollableElement = document.querySelector('#mainContent');
    var imgLoader;

    UI.init = function() {
      var overlay;

      overlay = document.querySelector('nav[data-type="scrollbar"] p');
      var jumper = document.querySelector('nav[data-type="scrollbar"] ol');

      var params = {
        overlay: overlay,
        jumper: jumper,
        groupSelector: '#group-',
        scrollToCb: scrollToCb
      };

      utils.alphaScroll.init(params);
      contacts.Search.init(document.getElementById('content'), null,
                           onSearchResultCb);
    };

    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
      // uncomment this to make it work on B2G-Desktop
      // parent.postMessage(msg, '*');
    };

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
    Importer.start = function(acc_tk) {
      setCurtainHandlers();

      if (acc_tk) {
        access_token = acc_tk;
        Importer.getFriends(acc_tk);
      }
      else {
        fb.oauth.getAccessToken(function(new_acc_tk) {
          access_token = new_acc_tk;
          Importer.getFriends(new_acc_tk);
        }, 'friends');
      }
    };

    /**
     *  Invoked when the existing FB contacts on the Address Book are ready
     *
     */
    function contactsReady(e) {
      existingFbContacts = e.target.result;
      contactsLoaded = true;

      if (friendsLoaded) {
        // A synchronization will start asynchronously
        window.setTimeout(startSync, 0);

        markExisting(existingFbContacts);
      }
    }

    // Callback executed when a synchronization has finished successfully
    function syncSuccess(numChanged) {
      window.console.log('Synchronization ended!!!');
      syncOngoing = false;

      fb.sync.scheduleNextSync();
      var msg = {
        type: 'sync_finished',
        data: numChanged || ''
      };
      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
    }

    function startSync() {
      if (existingFbContacts.length > 0 && !syncOngoing) {
        syncOngoing = true;

        var callbacks = {
          success: syncSuccess
        };
        fb.sync.startWithData(existingFbContacts, myFriendsByUid, callbacks);
      }
    }

    /**
     *  Invoked when friends are ready
     *
     */
    function friendsAvailable() {
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
        markExisting(existingFbContacts);
      }

      Curtain.hide(sendReadyEvent);
    }

    function sendReadyEvent() {
      parent.postMessage({
        type: 'ready', data: ''
      }, fb.CONTACTS_APP_ORIGIN);
    }

    function showStatus(text) {
      statusMsg.querySelector('p').textContent = text;
      statusMsg.classList.add('visible');
      statusMsg.addEventListener('transitionend', function tend() {
        statusMsg.removeEventListener('transitionend', tend);
        setTimeout(function hide() {
          statusMsg.classList.remove('visible');
        }, STATUS_TIME);
      });
    }

    /**
     *  Existing contacts are disabled
     *
     */
    function markExisting(deviceFriends) {
      updateButton.textContent = deviceFriends.length === 0 ? _('import') :
                                                              _('update');

      deviceFriends.forEach(function(fbContact) {
        var uid = fb.getFriendUid(fbContact);
        // We are updating those friends that are potentially selectable
        delete selectableFriends[uid];
        var ele = document.querySelector('[data-uuid="' + uid + '"]');
        // This check is needed as there might be existing FB Contacts that
        // are no longer friends
        if (ele) {
          setChecked(ele.querySelector('input[type="checkbox"]'), true);
        }
        if (existingFbContactsByUid[uid]) {
          existingFbContactsByUid[uid].push(fbContact);
        } else {
          existingFbContactsByUid[uid] = [fbContact];
        }
      });

      var newValue = myFriends.length -
                        Object.keys(existingFbContactsByUid).length;
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
     *  Gets the Facebook friends by invoking Graph API
     *
     */
    Importer.getFriends = function(acc_tk) {
      currentNetworkRequest = fb.utils.runQuery(friendsQueryStr, {
          success: fb.importer.friendsReady,
          error: fb.importer.errorHandler,
          timeout: fb.importer.timeoutHandler
      },acc_tk);

      // In the meantime we obtain the FB friends already on the Address Book
      if (!navigator.mozContacts) {
        return;
      }

      var req = fb.utils.getAllFbContacts();

      req.onsuccess = contactsReady;

      req.onerror = function(e) {
        window.console.error('Error while retrieving FB Contacts' ,
                                  e.target.error.name); };
    };

    function friendImportTimeout() {
      if (currentRequest) {
        window.setTimeout(currentRequest.ontimeout, 0);
      }
    }

    function friendImportError(e) {
      currentRequest.failed(e);
    }

    Importer.importFriend = function(uid, acc_tk) {
      access_token = acc_tk;

      currentRequest = new fb.utils.Request();

      window.setTimeout(function do_importFriend() {
        var oneFriendQuery = buildFriendQuery(uid);
        currentNetworkRequest = fb.utils.runQuery(oneFriendQuery, {
                            success: Importer.importDataReady,
                            error: friendImportError,
                            timeout: friendImportTimeout
        }, access_token);
      },0);

      return currentRequest;
    };

    // Invoked when friend data to be imported is ready
    Importer.importDataReady = function(response) {
      if (typeof response.error === 'undefined') {
        // Just in case this is the first contact imported
        nextUpdateTime = Date.now();
        var photoTimeout = false;

        var friend = response.data[0];
        if (friend) {
          fillData(friend);

          var cimp = new ContactsImporter([friend]);
          cimp.start();
          cimp.onsuccess = function() {
            var theUrl = friend.pic_big;
            // If timeout happened then the Url must be set to null to enable
            // later reconciliation through the sync process
            if (photoTimeout === true) {
              theUrl = null;
            }
            currentRequest.done({
              uid: friend.uid,
              url: theUrl
            });

            // If there is no an alarm set it has to be set
            window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
              if (!data) {
                fb.utils.setLastUpdate(nextUpdateTime, function() {
                  fb.sync.scheduleNextSync();
                });
              }
            });
          }; // onsuccess
          cimp.onPhotoTimeout = function() {
            photoTimeout = true;
          };
        } // if friend
        else {
          window.console.error('FB: No Friend data found');
          currentRequest.failed('No friend data found');
        }
      }
      else {
        // Post error to link we don't need to check here
        currentRequest.failed(response.error);
      }
    };

    function buildFriendQuery(uid) {
      var aquery1 = [].concat(FRIENDS_QUERY);
      aquery1[UID_FILTER_IDX] = '= ' + uid;

      var query1 = aquery1.join('');

      return query1;
    }

    function setInfraForSync(callback) {
      // Check wether we need to set the update alarm
      window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
        if (!data || (existingFbContacts && existingFbContacts.length === 0) &&
            !friendsImported) {
          // This is the first contact imported
          fb.utils.setLastUpdate(nextUpdateTime, function() {
            var req = fb.sync.scheduleNextSync();
            if (typeof callback === 'function') {
              req.onsuccess = callback;
            }
          });
        }
      });
    }


    /**
     *  Callback invoked when friends are ready to be used
     *
     *
     */
    Importer.friendsReady = function(response) {
      if (typeof response.error === 'undefined') {
        // This is the timestamp for later syncing as it set at the time
        // when data was ready
        nextUpdateTime = Date.now();

        var lmyFriends = response.data;

        // Now caching the number
        fb.utils.setCachedNumFriends(lmyFriends.length);

        myFriendsByUid = {};
        myFriends = [];

        lmyFriends.forEach(function(f) {
          fillData(f);

          myFriendsByUid[f.uid] = f;
          selectableFriends[f.uid] = f;
          myFriends.push(f);
        });

        fbFriends.List.load(myFriends, friendsAvailable);
      }
      else {
        window.console.error('FB: Error, while retrieving friends',
                                                    response.error.message);
        if (response.error.code !== 190) {
          // General Facebook problem
          setCurtainHandlersErrorFriends();
          Curtain.show('error', 'friends');
        }
        else {
          // There was a problem with the access token
          Curtain.hide();
          window.asyncStorage.removeItem(fb.utils.TOKEN_DATA_KEY,
            function token_removed() {
              Importer.start();
              parent.postMessage({
                type: 'token_error',
                data: ''
              },fb.CONTACTS_APP_ORIGIN);
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
      }, fb.CONTACTS_APP_ORIGIN);
    }

    function setCurtainHandlersErrorFriends() {
      Curtain.oncancel = function friends_cancel() {
          Curtain.hide();

          parent.postMessage({
            type: 'abort',
            data: ''
          }, fb.CONTACTS_APP_ORIGIN);
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

    function fillData(f) {
      fb.friend2mozContact(f);
    }

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
        }, fb.CONTACTS_APP_ORIGIN);
      }

      if (Importer.getContext() === 'ftu') {
        Curtain.hide(function onhide() {
          notifyParent(numFriends);
        });
      } else {
        parent.postMessage({
          type: 'fb_updated',
          data: ''
        }, fb.CONTACTS_APP_ORIGIN);

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

    function getCleaner(mode, contacts, cb) {
      if (mode === 'update') {
        var cleaner = new fb.utils.FbContactsCleaner(contacts, mode);
        window.setTimeout(cleaner.start, 0);
        cb(cleaner);
      }
      else {
        // Mode === clear
        var req = fb.utils.clearFbData();
        req.onsuccess = function() {
          cb(req.result);
        };

        req.onerror = function(e) {
          window.console.error('Error while starting cleaning: ',
                               e.target.error.name);
          cb(null);
        };
      }
    }

    function cleanContacts(onsuccess, progress) {
      var contacts = [];
      var unSelectedKeys = Object.keys(unSelectedContacts);
      // FbContactsCleaner expects an Array object
      unSelectedKeys.forEach(function iterator(uid) {
        var deviceContacts = unSelectedContacts[uid];
        for (var i = 0; i < deviceContacts.length; i++) {
          contacts.push(deviceContacts[i]);
        }
      });

      // To optimize if the user wishes to unselect all
      var mode = 'update';
      if (unSelectedKeys.length === existingFbContacts.length) {
        mode = 'clear';
      }

      getCleaner(mode, contacts, function got_cleaner(cleaner) {
        if (cleaner) {
          cleaner.oncleaned = progress.update;
          cleaner.onsuccess = onsuccess;
        }
        else {
          Importer.errorHandler();
        }
      });
    }

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
          // Check whether we need to set the last update and schedule next
          // sync. Only in that case otherwise that will be done by the sync
          // process
          setInfraForSync(function() {
            friendsImported = true;
          });

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
      for (var uid in existingFbContactsByUid) {
        unSelectedContacts[uid] = existingFbContactsByUid[uid];
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
          if (existingFbContactsByUid[uuid]) {
            unSelectedContacts[uuid] = existingFbContactsByUid[uuid];
          }
        }

        checkDisabledButtons();

        out = true;
      }

      return out;
    };

    /**
     *   Implements a Contacts Importer which imports Contacts in chunk sizes
     *
     *
     */
    var ContactsImporter = function(pcontacts, progress) {
      // The selected contacts
      var mcontacts = pcontacts;
      // The uids of the selected contacts
      var kcontacts = Object.keys(mcontacts);

      var chunkSize = 10;
      var pointer = 0;
      var mprogress = progress;
      var self = this;

      /**
       *  Imports a slice
       *
       */
      function importSlice() {
        var cgroup = kcontacts.slice(pointer, pointer + chunkSize);
          persistContactGroup(cgroup, function() {
            pointer += chunkSize; this.pending -= chunkSize;
            this.onsuccess();
          }.bind(this));
      } // importSlice

      /**
       *  This method allows to continue the process
       *
       */
      this.continue = function() {
        if (this.pending > 0) {
          if (this.pending < chunkSize) {
            var cgroup = kcontacts.slice(pointer, pointer + this.pending);
            persistContactGroup(cgroup, function() {
                  this.pending = 0;
                  this.onsuccess(); }.bind(this));
            }
          else {
            (importSlice.bind(this))();
          }
        }
      };

      /**
       *  Starts a new import process
       *
       */
      this.start = function() {
        pointer = 0;
        this.pending = kcontacts.length;
        (importSlice.bind(this))();
      };

      function updateProgress() {
        if (mprogress) {
          mprogress.update();
        }
      }

    /**
     *  Persists a group of contacts
     *
     */
    function persistContactGroup(cgroup, doneCB) {
      var numResponses = 0;
      var totalContacts = cgroup.length;

      cgroup.forEach(function(f) {
        var contact;
        if (navigator.mozContacts) {
          contact = new mozContact();
        }

        var cfdata = mcontacts[f];

        fb.utils.getFriendPicture(cfdata.uid, function save_friend_info(photo) {
          // When photo is ready this code will be executed

          var worksAt = fb.getWorksAt(cfdata);
          var address = fb.getAddress(cfdata);

          var birthDate = null;
          if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
            birthDate = fb.getBirthDate(cfdata.birthday_date);
          }

          var fbInfo = {
                          bday: birthDate,
                          org: [worksAt]
          };

          if (address) {
            fbInfo.adr = [address];
          }

          // This is the short telephone number to enable indexing
          if (cfdata.shortTelephone) {
            fbInfo.shortTelephone = cfdata.shortTelephone;
            delete cfdata.shortTelephone;
          }

          // Check whether we were able to get the photo or not
          fbInfo.url = [];

          if (photo) {
            fbInfo.photo = [photo];
            if (cfdata.pic_big) {
              // The URL is stored for synchronization purposes
              fb.setFriendPictureUrl(fbInfo, cfdata.pic_big);
            }
          }
          else if (typeof self.onPhotoTimeout === 'function') {
            self.onPhotoTimeout(cfdata.uid);
          }

          // Facebook info is set and then contact is saved
          cfdata.fbInfo = fbInfo;
          var fbContact = new fb.Contact();
          fbContact.setData(cfdata);

          var request = fbContact.save();

          request.onsuccess = function() {
            numResponses++;
            updateProgress();

            if (numResponses === totalContacts) {
              if (typeof doneCB === 'function') {
                doneCB();
              }
            }
          }; /// onsuccess

          request.onerror = function() {
            numResponses++;
            updateProgress();

            window.console.error('FB: Contact Add error: ', request.error,
                                                            cfdata.uid);

            if (numResponses === totalContacts) {
              if (typeof doneCB === 'function') {
                doneCB();
              }
            }
          };
        }, access_token);  // getContactPhoto
      }); //forEach
    } // persistContactGroup
  }; //contactsImporter

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
      var numFriends = Object.keys(selectedContacts).length;
      var cImporter = new ContactsImporter(selectedContacts, progress);

      cImporter.onsuccess = function() {
        if (cImporter.pending > 0) {
          window.setTimeout(function() {
            cImporter.continue();
          },0);
        } else {
          window.setTimeout(importedCB, 0);
        }
      };

      cImporter.start();
    };

  })(document);
}
