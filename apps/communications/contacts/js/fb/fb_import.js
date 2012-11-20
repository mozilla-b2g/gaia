'use strict';

var fb = window.fb || {};

if (typeof fb.importer === 'undefined') {
  (function(document) {

    var Importer = fb.importer = {};
    var UI = Importer.ui = {};

    var access_token;

    // Friends selected to be sync to the address book
    var selectedContacts = {};

    // Friends that are suitable to be selected
    var selectableFriends = {};

    // The whole list of friends as an array
    var myFriends, myFriendsByUid;

    // Existing FB contacts
    var existingFbContacts = [];

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
      ' work, education, cell, other_phone, hometown_location' ,
      ' FROM user' ,
      ' WHERE uid ',
      'IN (SELECT uid1 FROM friend WHERE uid2=me())' ,
      ' ORDER BY last_name'
    ];

    var UID_FILTER_IDX = 5;

    var friendsQueryStr = FRIENDS_QUERY.join('');

    var selButton = document.querySelector('#select-all');
    var contactList = document.querySelector('#groups-list');

    var headerElement = document.querySelector('header');
    var friendsMsgElement = document.querySelector('#friends-msg');
    var scrollableElement = document.querySelector('#mainContent');

    var BLOCK_SIZE = 5;

    UI.init = function() {
      var overlay, overlayContent;

      overlay = overlayContent = document.querySelector('#shortcuts #current');
      var jumper = document.querySelector('#shortcuts ol');

      var params = {
        overlay: overlay,
        overlayContent: overlayContent,
        jumper: jumper,
        groupSelector: '#group-',
        scrollToCb: scrollToCb
      };

      utils.alphaScroll.init(params);
      contacts.Search.init(document.getElementById('content'));
    }

    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
      // uncomment this to make it work on B2G-Desktop
      // parent.postMessage(msg, '*');
    }

    function scrollToCb(groupContainer) {
      scrollableElement.scrollTop = groupContainer.offsetTop;
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
    }

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

        disableExisting(existingFbContacts);
      }
    }

    // Callback executed when a synchronization has finished successfully
    function syncSuccess() {
      window.console.log('Synchronization ended!!!');
      syncOngoing = false;

      fb.sync.scheduleNextSync();
      var msg = {
        type: 'sync_finished',
        data: ''
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
      Curtain.hide(sendReadyEvent);

      friendsLoaded = true;

      if (contactsLoaded) {
        window.setTimeout(startSync, 0);

        disableExisting(existingFbContacts);
      }
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
    function disableExisting(friends) {
      var newValue = myFriends.length - friends.length;

      var eleNumImport = document.querySelector('#num-friends');
      if (eleNumImport.value && eleNumImport.value.length > 0) {
        var newValue = parseInt(eleNumImport.value) - friends.length;
      }

      eleNumImport.value = newValue;

      friendsMsgElement.textContent = _('fbFriendsFound', {
        numFriends: newValue
      });

      friends.forEach(function(fbContact) {
        var uid = new fb.Contact(fbContact).uid;

        delete selectableFriends[uid];

        var ele = document.querySelector('[data-uuid="' + uid + '"]');
        // This check is needed as there might be existing FB Contacts that
        // are no longer friends
        if (ele) {
          var input = ele.querySelector('input');
          input.checked = true;

          ele.setAttribute('aria-disabled', 'true');
        }
      });
    }

    // Only needed for testing purposes
    Importer.setSelected = function(friends) {
      selectedContacts = friends;
    }

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
                                  e.target.error.name); }
    }

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
    }

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
          } // onsuccess
          cimp.onPhotoTimeout = function() {
            photoTimeout = true;
          }
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
    }

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
                                         Importer.start);
        }
      }
    }

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
        }

      Curtain.onretry = function get_friends() {
        Curtain.oncancel = cancelCb;
        Curtain.show('wait', 'friends');

        Importer.getFriends(access_token);
      }
    }

    // Error / timeout handler
    Importer.baseHandler = function(type) {
      setCurtainHandlersErrorFriends();
      Curtain.show(type, 'friends');
    }

    Importer.timeoutHandler = function() {
      Importer.baseHandler('timeout');
    }

    Importer.errorHandler = function() {
      Importer.baseHandler('error');
    }

    function fillData(f) {
      fb.friend2mozContact(f);
    }

    /**
     *  This function is invoked when the user starts the process of importing
     *
     */
    UI.importAll = function(e) {
      if (Object.keys(selectedContacts).length > 0) {

        Importer.importAll(function on_all_imported() {

          // Check whether we need to set the last update and schedule next sync
          // Only in that case otherwise that will be done by the sync process
          setInfraForSync(function() {
            friendsImported = true;
          });

          var list = [];
          // Once all contacts have been imported, they are unselected
          Object.keys(selectedContacts).forEach(function(c) {
            list.push(selectedContacts[c]);
          });

          disableExisting(list);
          selectedContacts = {};
        });
      }
      else {
        window.console.error('No friends selected. Doing nothing');
      }
    }

    /**
     *  Invoked when the user selects all his friends
     *
     *
     */
    UI.selectAll = function(e) {
      bulkSelection(true);

      selectedContacts = selectableFriends;

      selButton.textContent = 'Unselect All';
      selButton.onclick = UI.unSelectAll;

      return false;
    }

    UI.back = function(e) {
      document.body.dataset.state = 'welcome';
    }

    /**
     *  Invoked when the user unselects all her contacts
     *
     */
    UI.unSelectAll = function(e)  {
      bulkSelection(false);

      selButton.textContent = 'Select All';
      selButton.onclick = UI.selectAll;

      selectedContacts = {};

      return false;
    }

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
      var list = contactList.querySelectorAll(
                                        'li[data-uuid][aria-disabled="false"]');

      var total = list.length;

      for (var c = 0; c < total; c++) {
        list[c].querySelector('input[type="checkbox"]').checked = value;
      }
    }


    /**
     *   Invoked when an element in the friend list is selected
     *
     */
    UI.selection = function(e) {
      var uid, ele, checked;

      checked = false;

      if (e.target.dataset.uuid) {
        uid = e.target.dataset.uuid;
      }
      else if (e.target.tagName === 'INPUT') {
         ele = e.target;
         checked = true;
      }

      if (typeof ele === 'undefined') {
        ele = contactList.querySelector('input[name=' + '"' + uid + '"' + ']');
      }

      if ((ele.checked !== true && checked !== true) ||
                                    (checked && ele.checked === true)) {

        if (!checked) {
          ele.checked = true;
        }
        selectedContacts[ele.name] = myFriendsByUid[ele.name];
      }
      else {
          if (!checked) {
            ele.checked = false;
          }
          delete selectedContacts[ele.name];
      }
    }


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
      var total = this.pending = kcontacts.length;
      var mprogress = progress;
      var counter = 0;
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
      }

      /**
       *  Starts a new import process
       *
       */
      this.start = function() {
        pointer = 0;
        this.pending = kcontacts.length;
        (importSlice.bind(this))();
      }

      function updateProgress() {
        if (mprogress) {
          mprogress.update(++counter,total);
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
  } //contactsImporter

    Importer.getContext = function() {
      var out = 'contacts';

      if(window.location.search.indexOf('ftu') !== -1) {
        out = 'ftu';
      }

      return out;
    }

    /**
     *  Imports all the selected contacts on the address book
     *
     */
    Importer.importAll = function(importedCB) {
      var progress = Curtain.show('progress', 'import');

      var numFriends = Object.keys(selectedContacts).length;
      var cImporter = new ContactsImporter(selectedContacts, progress);

      cImporter.onsuccess = function() {
        if (cImporter.pending > 0) {
          window.setTimeout(function() {
            cImporter.continue();
          },0);
        } else if (Importer.getContext() === 'ftu') {
          // .6 seconds delay in order to show the progress 100% to users
          window.setTimeout(function() {
            Curtain.hide(function onhide() {
              showStatus(_('friendsImported', {
                numFriends: numFriends
              }));
            });
          }, 600);

          window.setTimeout(importedCB, 0);
        } else {
          parent.postMessage({
            type: 'fb_imported',
            data: ''
          }, fb.CONTACTS_APP_ORIGIN);

          window.addEventListener('message', function finished(e) {
            if (e.data.type === 'contacts_loaded') {
              // When the list of contacts is loaded and it's the current view
              Curtain.hide(function onhide() {
                // Please close me and display the number of friends imported
                parent.postMessage({
                  type: 'window_close',
                  data: '',
                  message: _('friendsImported', {
                    numFriends: numFriends
                  })
                }, fb.CONTACTS_APP_ORIGIN);
              });
              window.removeEventListener('message', finished);
            }
          });

          window.setTimeout(importedCB, 0);
        }
      };

      cImporter.start();
    }

  })(document);
}
