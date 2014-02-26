/*global Template, Utils */

'use strict';

(function(exports) {

var FLAVORS = {
  /*
   * renderAll controls whether all phone numbers sohuld be rendered for this
   * contact
   *
   * shouldHighlight controls whether we should generate a markup allowing
   * highlighting depending on the input
   *
   * template "main" will get the following parameters:
   * - name: the contact's title
   * - number: the phone number
   * - nameHTML: same than name if shouldHighlight is false, otherwise contains
   *   markup with the highlighting
   * - numberHTML: see nameHTML
   * - photoHTML: result of the "photo" template, if present
   * - type: phone number type information
   * - carrier: phone number carrier information
   * - separator: the separator between type or carrier and the phone number
   *
   * template "photo" will get the following parameters:
   * - photoURL: the URL of the contact's first photo
   *
   */
  suggestion: {
    renderAll: true,
    shouldHighlight: true,
    templates: {
      main: 'contact-suggestion-tmpl'
    }
  },
  prompt: {
    renderAll: false,
    shouldHighlight: false,
    templates: {
      main: 'contact-prompt-tmpl',
      photo: 'contact-photo-tmpl'
    }
  },
  'group-view': {
    renderAll: false,
    shouldHighlight: false,
    templates: {
      main: 'contact-suggestion-tmpl',
      photo: 'contact-photo-tmpl'
    }
  }
};

/* let's lazy load generic templates */
var templates = {};

function getTemplate(id) {
  if (!templates[id]) {
    templates[id] = Template(id);
  }
  return templates[id];
}

var highlightTemplateId = 'contact-highlight-tmpl';

// Warning: always feed this function an already escaped data
function highlight(escapedData, regexpArray) {
  // When rendering a suggestion, we highlight the matched substring.
  // The approach is to escape the html and the search string, and
  // then replace on all "words" (whitespace bounded strings) with
  // the substring run through the highlight template.

  // this variable will allow skipping to the next regexp
  var matchFound;
  var template = getTemplate(highlightTemplateId);

  function loopReplaceFn(match) {
    matchFound = true;
    // The match is safe, because splitData[i] is derived from
    // escapedData
    return template.interpolate({
      str: match
    }, {
      safe: ['str']
    });
  }

  var splitData = escapedData.split(/\s+/);

  // For each "word"
  for (var i = 0; i < splitData.length; i++) {
    matchFound = false;
    // Loop over search term regexes
    for (var k = 0; !matchFound && k < regexpArray.length; k++) {
      splitData[i] = splitData[i].replace(regexpArray[k], loopReplaceFn);
    }
  }
  return splitData.join(' ');
}

var ContactRenderer = exports.ContactRenderer = function constructor(opts) {
  if (!opts) {
    throw new Error('ContactRenderer constructor needs an options object');
  }

  this.opts = opts;
  this.templates = {};
  for (var key in opts.templates) {
    var id = opts.templates[key];
    this.templates[key] = Template(id);
  }

  if (this.templates.photo) {
    this.opts.renderPhoto = true;
  }
};

ContactRenderer.prototype = {
  // Returns true when a contact has been rendered
  // Returns false when no contact has been rendered
  render: function cr_render(renderOpts) {
    /**
     *
     * params {
     *   contact:
     *     A contact object.
     *
     *   input:
     *     Any input value associated with the contact,
     *     possibly from a search or similar operation.
     *
     *   skip:
     *     An array of phone numbers that should not be rendered
     *
     *   target:
     *     Parent node to append the rendered node to
     * }
     *
     */

    var contact = renderOpts.contact;
    var input = renderOpts.input;
    input = input && input.trim();
    var target = renderOpts.target;
    var shouldHighlight = this.opts.shouldHighlight;
    var renderAll = this.opts.renderAll;
    var renderPhoto = this.opts.renderPhoto;
    var skip = renderOpts.skip || [];

    // we can't do much without a contact
    if (!contact) {
      return false;
    }

    // don't render if there is no phone number
    // TODO: Add email checking support for MMS
    if (!contact.tel || !contact.tel.length) {
      return false;
    }

    // We search on the escaped HTML via a regular expression
    var escaped = Utils.escapeRegex(Template.escape(input));
    var escsubs = escaped.split(/\s+/);
    // Build a list of regexes used for highlighting suggestions
    var regexps = {
      name: escsubs.map(function(k) {
        // String matches occur on the beginning of a "word" to
        // maintain parity with the contact search algorithm which
        // only considers left aligned exact matches on words
        return new RegExp('^' + k, 'gi');
      }),
      number: [new RegExp(escaped, 'ig')]
    };

    var include = renderPhoto ? { photoURL: true } : null;
    var tels = contact.tel;
    var details = Utils.getContactDetails(tels[0].value, contact, include);

    var tempDiv = document.createElement('div');

    tels.forEach(function(current) {
      // Only render a contact's tel value entry for the _specified_
      // input value when not rendering all values. If the tel
      // record value _doesn't_ match, then continue.
      //
      if (!renderAll && !Utils.probablyMatches(current.value, input)) {
        return;
      }

      // If rendering for contact search result suggestions, don't
      // render contact tel records for values that are already
      // selected as recipients. This comparison should be safe,
      // as the value in this.recipients.numbers comes from the same
      // source that current.value comes from.
      if (renderAll && skip.indexOf(current.value) > -1) {
        return;
      }

      var data = Utils.getDisplayObject(details.title, current);

      ['name', 'number'].forEach(function(key) {
        var escapedData = Template.escape(data[key]);
        if (shouldHighlight) {
          escapedData = highlight(escapedData, regexps[key]);
        }

        data[key + 'HTML'] = escapedData;
      });

      // Render contact photo only for specific flavor
      if (renderPhoto && details.photoURL) {
        data.photoHTML = this.templates.photo.interpolate({
          photoURL: details.photoURL
        });
        Utils.asyncLoadRevokeURL(details.photoURL);
      } else {
        data.photoHTML = '';
      }

      // Interpolate HTML template with data and inject.
      // Known "safe" HTML values will not be re-sanitized.
      tempDiv.innerHTML = this.templates.main.interpolate(data, {
        safe: ['nameHTML', 'numberHTML', 'srcAttr', 'photoHTML']
      });

      var element = tempDiv.firstElementChild;

      // scan for translatable stuff
      navigator.mozL10n.translate(element);

      target.appendChild(element);

      tempDiv.textContent = '';
    }, this);

    return true;
  }
};

ContactRenderer.flavor = function(flavor) {
  // we could possibly cache instances here, if we need more performance
  return new ContactRenderer(FLAVORS[flavor]);
};

})(window);
