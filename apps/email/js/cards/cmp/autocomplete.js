'use strict';
define(function(require) {

var GestureDetector = require('shared/js/gesture_detector'),
    itemTemplate = require('tmpl!./autocomplete_item.html'),
    mozL10n = require('l10n!'),
    regExpEscape = require('regExpEscape'),
    transitionEnd = require('transition_end'),
    validTypes = {
      email: true,
      text: true
    };

/**
 * Converts a text string into a span and some text nodes that are placed
 * as the children of node. The span contains the match for the queryRegExp.
 * @param  {RegExp} queryRegExp The regexp whose match is highlighted via a
 * span in the target text.
 * @param  {String} text        The target text to find the match.
 * @param  {Element} node       The element that will display the matched text.
 */
function formatMatchString(queryRegExp, text, node) {
  // Just highlight the first match.
  var match = queryRegExp.exec(text);

  if (match) {
    var index = match.index,
        endIndex = index + queryRegExp.source.length;

    var startString = text.substring(0, index);
    if (startString) {
      node.appendChild(document.createTextNode(startString));
    }

    var matchString = text.substring(index, endIndex);
    if (matchString) {
      var span = document.createElement('span');
      span.classList.add('highlight');
      span.textContent = matchString;
      node.appendChild(span);
    }

    var endString = text.substring(endIndex);
    if (endString) {
      node.appendChild(document.createTextNode(endString));
    }
  } else {
    node.textContent = text;
  }
}

/**
 * Given a node, if it or an ancestor has the CSS className, return the node
 * with that className. Returns null if not a match.
 * @param  {Node} node
 * @return {Node}
 */
function findAncestorWithClass(node, className) {
  for (; node; node = node.parentNode) {
    if (node.classList && node.classList.contains(className)) {
      return node;
    }
  }

  return null;
}

/**
 * Given a node, if it or an ancestor is an autocomplete item in the
 * autocomplete list, return the autcomplete item node. Returns null if not a
 * match.
 * @param  {Node} node
 * @return {Node}
 */
function getAutocompleteItem(node) {
  return findAncestorWithClass(node, 'cmp-autocomplete-item');
}

/**
 * Autocomplete custom element that contains a list of elements that show the
 * autocomplete matches.
 *
 * This custom element relies on a CSS class-based API to bind to nodes outside
 * of this autocomplete. The CSS/HTML structure expected by this autocomplete:
 *
 * - An element with the CSS class of "cmp-autocomplete-origin" that is the the
 * master scroll area for the view. It should be an ancestor node to the
 * autocomplete and also contain the 'cmp-autocomplete-input-list' element that
 * has all the input elements. This element is used as the "origin" for the
 * style.top placement of the autocomplete list.
 *
 * - An element that holds all the input fields, with the CSS class of
 * "cmp-autocomplete-input-list". That inputArea will be translateY'd to make
 * sure the current input focus is visible at the top of the view.
 *
 * - Individual rows that hold an autocomplete must specify a
 * "cmp-autocomplete-input-label" CSS class, so that for a given input, that
 * parent can be found to be marked as "active". This allows just that row to
 * change its alignment so its label and + icon are aligned at the bottom with
 * the text input.
 *
 * The autocomplete custom element also expects a "data-source" HTML attribute
 * to be set on it, which indicates the module ID to use as the data source for
 * the matches.
 *
 * The owner of this custom element instance (typically a view card), should
 * override the getExistingEntries() method on the instance to return the
 * current entries, to avoid dupes showing up in subsequent autocomplete
 * matches.
 */
return [
  require('../base')(),
  {
    createdCallback: function() {
      this.lastTranslateY = 0;
      this.inputAreaTranslated = Promise.resolve();

      this.runQuery = this.runQuery.bind(this);
      this.onFocus = this.onFocus.bind(this);
      this.onDocumentEvent = this.onDocumentEvent.bind(this);
      this.onInput = this.onInput.bind(this);

      // Find (when cached HTML) or create list to hold the autocomplete matches
      // Put the list inside the autocomplete element instead of off the
      // document, as it should be within a given UI card, in case in-app
      // overlay UIs like confirm dialogs need to be shown.
      this.list = this.querySelector('.cmp-autocomplete-list');
      if (!this.list) {
        this.list = document.createElement('ul');
        this.list.classList.add('cmp-autocomplete-list');
        this.appendChild(this.list);
      }
      this.list.addEventListener('keydown', this.onMatchKeyDown.bind(this));
      this.list.addEventListener('click', this.onMatchClick.bind(this));
      this.list.innerHTML = '';
      this.hideList();

      // Find parent that is scrollable and is the origin for measurements.
      var parentNode = this;
      while((parentNode = parentNode.parentNode)) {
        if (parentNode.classList.contains('cmp-autocomplete-origin')) {
          this.originNode = parentNode;
          break;
        }
      }

      // Hold on to the element that holds all the input fields, to use it for
      // sizing and setting scroll behavior amongst the inputs while the
      // autocomplete is active.
      this.inputArea = this.originNode
                       .querySelector('.cmp-autocomplete-input-list');

      // Listen for transitionend events on the inputArea, since translateY with
      // a transition is used to move the input to the top of the view. Want to
      // wait for the transition to end before showing autocomplete results.
      // This allows the user to better track where the addresses have gone,
      // and feels smoother.
      transitionEnd(this.inputArea, this._translateYTransitionEnd.bind(this));

      // Bind to events triggered by input field children. Need to mark the
      // elements with an autocomplete class, and do not want to target just
      // any input in the inputArea, so using explicit per-element bindings
      // instead of event delegation.
      var nodes = this.inputArea.querySelectorAll('input');
      Array.from(nodes, function(inputNode) {
        if (!validTypes.hasOwnProperty(inputNode.type)) {
          return;
        }

        // Add a class to the input to mark it as participating in autocomplete.
        // This is used to know if taps in them should be disregarded for
        // onDocumentEvent purposes.
        inputNode.classList.add('cmp-autocomplete-input');

        inputNode.addEventListener('focus', this.onFocus);
        inputNode.addEventListener('input', this.onInput);
      }, this);

      // Use a GestureDetector to know when user tries to scroll the inputArea
      // element to see addresses that have been scrolled out of the way for
      // autocomplete maximum real estate. No need to clean this up later, the
      // destruction of the card using the autocomplete is enough: the watched
      // element is destroyed along with the autocomplete.
      this.detector = new GestureDetector(this.inputArea);
      this.inputArea.addEventListener('pan', (event) => {
        this.hide();
      });
      this.detector.startDetecting();

      // Set up data source.
      var dataSourceId = this.dataset.source;
      if (dataSourceId) {
        this.bindDataSource(dataSourceId);
      }
    },

    /**
     * Custom element callback when element is placed in the document.
     */
    attachedCallback: function() {
      this.onResize = this.onResize.bind(this);
      window.addEventListener('resize', this.onResize, false);

      // Explicitly want to listen during the capture phase, since most code
      // listens in bubble phase, and may stopPropagation. For autocomplete
      // hiding though we always want it to disappear if event is outside of
      // the interesting areas.
      document.addEventListener('click', this.onDocumentEvent, true);
      document.addEventListener('focus', this.onDocumentEvent, true);
    },

    /**
     * Custom element callback when element is removed from the document.
     */
    detachedCallback: function() {
      window.removeEventListener('resize', this.onResize, false);
      document.removeEventListener('click', this.onDocumentClick, true);
      document.addEventListener('focus', this.onDocumentEvent, true);
    },

    /**
     * Triggered by input focus events.
     */
    onFocus: function(event) {
      this.inputNode = event.target;

      // If existing label node, be sure to remove the active class from it. In
      // cases where the focus goes from one input to the other, hide() does not
      // run to clear this state.
      if (this.inputLabelNode) {
        this.inputLabelNode.classList.remove('cmp-autocomplete-active');
      }

      this.inputLabelNode = findAncestorWithClass(this.inputNode,
                                                'cmp-autocomplete-input-label');
      this.inputLabelNode.classList.add('cmp-autocomplete-active');

      this.query = this.inputNode.value.trim();
      this.runThrottledQuery();
    },

    /**
     * Triggered by any click or focus in the document. Used to determine if the
     * autocomplete should be hidden.
     */
    onDocumentEvent: function(event) {
      var target = event.target;

      // If no classList, then it is not an element, and should be discarded.
      if (!target.classList) {
        this.hide();
        return;
      }

      // If an autocomplete input, do not do anything, handled by other code in
      // this module.
      if (target.classList.contains('cmp-autocomplete-input')) {
        return;
      }

      // Also ignore if it is part of an autocomplete-item.
      if (getAutocompleteItem(target)) {
        return;
      }
      this.hide();
    },

    /**
     * Triggered by input element input events.
     */
    onInput: function(event) {
      this.query = this.inputNode.value.trim();
      this.runThrottledQuery();
    },

    /**
     * Handles window resizes. Could be triggered by keyboard size changes.
     */
    onResize: function(event) {
      if (this.inputNode && !this.isHidden) {
        this.positionElements();
      }
    },

    onMatchKeyDown: function(event) {
      if (event.key === 'Enter' && !this.isHidden) {
        this.onMatchClick(event);
      }
    },

    /**
     * Handles taps inside the autocomplete. The tap could occur outside a match
     * element, in which case means the autocomplete should just close.
     */
    onMatchClick: function(event) {
      var node = getAutocompleteItem(event.originalTarget);

      if (node && node.match) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('autocompleteSelected', {
          detail: {
            match: node.match,
            inputNode: this.inputNode
          }
        }));
      }
    },

    /**
     * Loads the dataSource module.
     * @param  {String} dataSourceId The module ID for the data source.
     */
    bindDataSource: function(dataSourceId) {
      require([dataSourceId], (dataSource) => {
        this.dataSource = dataSource;
        if (this.query) {
          this.runThrottledQuery();
        }
      });
    },

    /**
     * Called to trigger finding matches from the dataSource. Set on a timeout
     * to avoid multiple fast keystrokes from triggering too many rapid queries.
     */
    runThrottledQuery: function() {
      if (!this.query || !this.dataSource) {
        this.list.innerHTML = '';
        this.positionAndHide();
        return;
      }

      if (!this.timedQueryId) {
        // The choice of delay tries to balance sending too many queries to the
        // contacts API vs giving a feeling of responsiveness for the reaction
        // of the autocomplete. This balance may be affected by the total number
        // of contacts.
        this.timedQueryId = setTimeout(this.runQuery, 350);
      }
    },

    /**
     * The owner of this autocomplete instance should set this value if they
     * have extra spacing around the input that should be maintained for better
     * visual display, and to avoid small scroll janks on initial positioning
     * of the input element if it needs to be scrolled to the top of the view.
     */
    verticalSpace: 0,

    /**
     * This method can be overriden by the owner of the autocomplete to return
     * existing entries already attached to the email. The result should be an
     * array of objects that have "name" and "address" properties.
     * @return {Array}   Array of existing entries.
     */
    getExistingEntries: function() {
      return [];
    },

    /**
     * Runs the query to find matches from the dataSource.
     */
    runQuery: function() {
      this.timedQueryId = 0;

      this.dataSource(this.query).then((result) => {
        // Protect against old or out of date queries
        if (result.query !== this.query) {
          return;
        }

        var existingEntries = this.getExistingEntries();

        var contacts = result.contacts;

        this.list.innerHTML = '';

        var queryRegExp = new RegExp(regExpEscape(this.query), 'i');

        contacts.forEach((contact) => {
          // Only care about contacts with an email address(es).
          var emails = contact.email;
          if (!emails || !emails.length) {
            return;
          }

          // Contact name could be an array, just use the first one.
          var name = contact.name;
          if (Array.isArray(name)) {
            name = name[0];
          }

          // Emails are an array, each one should get its own entry in the
          // autocomplete.
          emails.forEach((email) => {
            var address = email.value;

            // Do not add it if the email address is already an entry.
            var hasExisting = existingEntries.some(function(entry) {
              return entry.address === address;
            });
            if (hasExisting) {
              return;
            }

            var node = itemTemplate.cloneNode(true),
                detailsNode = node
                               .querySelector('.cmp-autocomplete-item-details'),
                nameNode = node.querySelector('.cmp-autocomplete-name'),
                emailNode = node.querySelector('.cmp-autocomplete-email');

            // Set the ariaLabel for the match, for screen reader use only.
            mozL10n.setAttributes(detailsNode, 'compose-autocomplete-match',
                                  { name: name, address: address });

            formatMatchString(queryRegExp,
                              name || address,
                              nameNode);
            formatMatchString(queryRegExp, address|| '', emailNode);

            // Store the match data on the node for ease of access when items
            // are tapped.
            var match = {
              name: name,
              address: address
            };
            node.match = match;

            this.list.appendChild(node);
          });
        });

        // Always reshow on a query, since each keystroke has the possibility of
        // breaking the input field to a new line.
        if (this.list.children.length) {
          this.show();
        } else {
          this.positionAndHide();
        }
      });
    },

    /**
     * Positions the input area to the top of the view and sizes the list to
     * take up as much view space as possible.
     */
    positionElements: function() {
      // Always calculate the originTop since the whole card that contains the
      // origin could be scrolled for some reason, even by an accident.
      var originTop = this.originNode.getBoundingClientRect().top;

      // Want to use the input element, and not a parent of it, for placement of
      // the autocomplete, since the input element can move to different lines
      // as typing occurs, where the parent's origin would not change, and would
      // be a bad reference point to use.
      var inputRect = this.inputNode.getBoundingClientRect();

      // Scroll the area so that the input item is now at the top of the
      // address area.
      var translateY = inputRect.top - originTop +
                      this.lastTranslateY -
                      this.verticalSpace;

      if (translateY !== this.lastTranslateY) {
        this.lastTranslateY = translateY;

        // Create a new promise to track the end of the inputArea translation.
        this.inputAreaTranslated = new Promise((resolve) => {
          // No need to track reject, only resolve/ok is followed in the
          // transitionEnd machinery.
          this._inputAreaResolve = resolve;
        });

        this.inputArea.style.transform = 'translateY(-' + translateY + 'px)';
      }

      return this.inputAreaTranslated.then(() => {
        this.listTop = inputRect.height + (2 * this.verticalSpace);
        this.list.style.top = this.listTop + 'px';
        this.list.style.height = (window.innerHeight - this.listTop -
                                  originTop) + 'px';

        // Set the list scrollTop to the top because previous listing could have
        // had it scrolled.
        this.list.scrollTop = 0;
      });
    },

    _translateYTransitionEnd: function(event) {
      if (this._inputAreaResolve) {
        this._inputAreaResolve();
        this._inputAreaResolve = null;
      }
    },

    show: function() {
      // The originNode should be at the top of its scroll area, and set a
      // CSS class on it that indicates the origin should not show scroll
      // bars or allow scrolling, to avoid overlapping, confusing double
      // scrollbars.
      this.originNode.scrollTop = 0;
      this.originNode.classList.add('cmp-autocomplete-noscroll');

      this.positionElements().then(() => {
        this.list.classList.remove('collapsed');
      });
    },

    hide: function() {
      this.hideList();

      if (this.inputLabelNode) {
        this.inputLabelNode.classList.remove('cmp-autocomplete-active');
      }

      this.inputArea.style.transform = 'translateY(0px)';
      this.lastTranslateY = 0;

      this.originNode.classList.remove('cmp-autocomplete-noscroll');
    },

    hideList: function() {
      this.list.classList.add('collapsed');
    },

    /**
     * Makes sure the input element is at the top of the view, but do not show
     * the autocomplete list because there are no matches to show.
     */
    positionAndHide: function() {
      this.positionElements().then(() => {
        this.hideList();
      });
    },

    get isHidden() {
      return this.list.classList.contains('collapsed');
    }
  }
];

});
