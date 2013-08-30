'use strict';

var utils = window.utils || {};

/*
 * The utils.contactFields is ittended to gather contact fields related utilites
 * such as normalization and composing methods.
 */
if (!utils.contactFields) {
  (function() {
    var ContactFields = utils.contactFields = {};

    /*
     * Return a composed complete name derived from givenName and familyName.
     */
    ContactFields.composeName = function(contact) {
      var givenName = (contact.givenName || [])[0] || '';
      var lastName = (contact.familyName || [])[0] || '';
      var completeName = [givenName, lastName].join(' ').trim() || undefined;
      return [completeName];
    };
  }) ();
}
