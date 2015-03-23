/* global
  Contacts,
  Settings,
  Utils
 */

'use strict';

(function(exports) {

  var RecipientValidator = function(recipients) {
    this.recipients = recipients;
  };

  RecipientValidator.prototype = {
    validate: function(record) {

      var hasFilter = record && record.number;
      var shouldLookup = record.isQuestionable || record.isLookupable;

      if (hasFilter && shouldLookup) {
        var strategy = record.isLookupable ? 'findByString' : 'findExact';

        return Contacts[strategy](record.number).then(
          (contacts) => this.validateResult(record, record.number, contacts)
        );
      }

      return Promise.resolve(record);
    },

    validateResult: function(source, fValue, contacts) {
      var isInvalid = true;
      var isContact = false;
      var record, length, number, contact;

      var props = ['tel'];
      if (Settings.supportEmailRecipient) {
        props.push('email');
      }

      // If there is greater than zero matches,
      // process the first found contact into
      // an accepted Recipient.
      if (contacts && contacts.length) {
        isInvalid = false;
        record = contacts[0];
        var values = props.reduce((values, prop) => {
          var propValue = record[prop];
          if (propValue && propValue.length) {
            return values.concat(propValue);
          }

          return values;
        }, []);
        length = values.length;

        // Received an exact match with a single tel or email record
        if (source.isLookupable && !source.isQuestionable && length === 1) {
          if (Utils.probablyMatches(values[0].value, fValue)) {
            isContact = true;
            number = values[0].value;
          }
        } else {
          // Received an exact match that may have multiple tel records
          for (var i = 0; i < length; i++) {
            var propValue = values[i].value;
            if (!this.recipients.has(propValue)) {
              number = propValue;
              break;
            }
          }

          // If number is not undefined, then it's safe to assume
          // that this number is unique to the recipient list and
          // can be added as an accepted recipient from the user's
          // known contacts.
          //
          // It _IS_ possible for this to appear to be a duplicate
          // of an existing accepted recipient: by display name ONLY;
          // however this case will always have a different number.
          //
          if (typeof number !== 'undefined') {
            isContact = true;
          } else {
            // If no number match could be made, then this
            // contact record is actually inValid.
            isInvalid = true;
          }
        }
      }

      // Either an exact contact with a single tel record was matched
      // or an exact contact with multiple tel records and we've taken
      // one of the non-accepted tel records to add a new recipient.
      if (isContact) {

        contact = Utils.basicContact(number, record);
        contact.source = 'contacts';

        return Promise.resolve(contact);
      }

      // Received multiple contact matches and the current
      // contact record had a number that has already been
      // accepted as a recipient. Try the next contact in the
      // set of results.
      if (isInvalid && contacts.length > 1) {
        return this.validateResult(source, fValue, contacts.slice(1));
      }

      // Plain numbers with no contact matches can never be "invalid"
      if (!source.isQuestionable && !length) {
        isInvalid = false;
      }

      // If there are no contacts matched
      // this input was definitely invalid.
      source.isInvalid = isInvalid;
      return Promise.resolve(source);
    }
  };

  exports.RecipientValidator = {
    for(recipients) {
      return new RecipientValidator(recipients);
    }
  };

})(window);
