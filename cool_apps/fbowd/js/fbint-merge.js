/*
 *  Module: Facebook integration
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module allows to work with Facebook providing a deep integration
 *  between the Open Web Device and Facebook
 *
 *
 */

if(typeof(owdFbInt) === 'undefined') {
    owdFbInt = {};

    owdFbInt.linkCandidatesReady = function(response) {

    };

    owdFbInt.listNewFriends = function() {

    };

    owdFbInt.newFriendsReady = function(response) {

    };
}

if(typeof(owdFbInt.ContactMerger) === 'undefined') {
  // Query that allows to obtain a set of possible
      // friends to link to Facebook
      var LINK_QUERY = 'SELECT uid,name FROM user WHERE name LIKE %?% AND\
                       uid IN (SELECT uid1 FROM friend WHERE uid2=me())';

      // Query to retrieve the data of a user
      var USER_QUERY = 'SELECT uid, name, first_name, last_name, middle_name, \
                          birthday_date, email, \
                          relationship_status, significant_other_id, work, \
                          education FROM user \
                          WHERE uid =?';
  /**
   *  Contacts merger object it takes a Contact Id as parameter and an accessToken
   *
   */
  owdFbInt.ContactMerger = function(contactId,accessToken) {
    var token = accessToken;

    this.start = function() {

    }

    /**
     *   This function normalizes a Telephone number
     *
     *
     */
    function normalizeTefNumber(tef) {
      return tef.replace(/\D/,'');
    }

    /**
     *  Checks whether two tef numbers are equivalent
     *
     */
    function tefNumberEquiv(tef) {

    }

    /**
     *  Merges two Contacts
     *
     */
    function mergeContacts(simContact,fbContact) {
      // Preference is for the SIM, thus we keep the SIM Contact as the master
    }

     /**
     *  Tries to link an existing contact on the address book with an existing
     *  Facebook Contact
     *
     */
    function linkLocalProposal(contactId,successCB) {
      var req = navigator.mozContacts.find({filterBy: ['id'],
                                                  filterValue: contactId,
                                                  filterOp: 'equals'});

      req.onsuccess = function(e) {
        var theContact = e.target.result[0];

        // Now get all the FB Contacts with category Facebook

        var req2 = navigator.mozContacts.find({filterBy: ['category'],
                                                filterValue: 'fb_not_linked',
                                                filterOp: 'equals'});

        req2.onsuccess = function(e) {
          var candidates = e.target.result;
          var list = candidates.filter(function(c) {
            var ret = false;

            if(c.name[0].indexOf(theContact.name[0]) !== -1) {
              ret = true;
            }
            else {
              var n1norm = normalizeTefNumber(c.telephone[0]);
              if(n1norm.indexOf(theContact.telephone[0]) !== -1) {
                ret = true;
              }
            }

            return ret;
          });

          successCB(list);
        };

      }; // onsuccess by Id

      req.onerror = function(e) {
        window.console.error('Error while retrieving Contact Id');
      }
    };
  }

  /**
   *  Tries to retrieve a new set of friends not present on the device
   *
   *
   */
  function getNewFriends() {
    
  }
}
