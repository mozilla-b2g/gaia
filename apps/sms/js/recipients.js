/*global

  GestureDetector,
  Navigation,
  RecipientValidator,
  Settings,
  SharedComponents,
  Utils
*/

(function(exports) {
  'use strict';
  // For Recipients it makes sense to refer to the
  // weakmap reference as "view", since that's what it
  // points to.
  //
  // For Recipients' internal data, use "data"
  //
  var view = new WeakMap();
  var priv = new WeakMap();
  var data = new WeakMap();
  var events = new WeakMap();
  var relation = new WeakMap();
  var rdigit = /^\d/;

  function Recipient(opts) {
    var number;

    opts = opts || {};
    this.name = opts.name || opts.number || '';
    this.number = (opts.number || '') + '';
    this.email = opts.email || '';
    this.editable = opts.editable || 'true';
    this.role = this.editable ? 'textbox' : 'button';
    this.source = opts.source || 'manual';
    this.type = opts.type || '';
    this.carrier = opts.carrier || '';
    this.className = 'recipient';
    this.isEmail = Settings.supportEmailRecipient &&
                   Utils.isEmailAddress(this.number);

    // isLookupable
    //  the recipient was accepted by pressing <enter>
    //
    this.isLookupable = opts.isLookupable || false;

    // isInvalid
    //  the typed value is non-digit and we've determined
    //  that there are no matches in the user's contacts
    //
    this.isInvalid = opts.isInvalid || false;

    // isQuestionable
    //  the typed value is non-digit and may have a match
    //  in the user's contacts
    //
    this.isQuestionable = opts.isQuestionable || false;

    // If the recipient was entered manually and
    // the trimmed, typed text starts with a non-number
    // (ignoring the presense of a '+'), the input value
    // is questionable and may be invalid.
    number = this.number[0] === '+' ? this.number.slice(1) : this.number;

    if (this.isEmail) {
      this.className += ' email';
    } else if (
      opts.isQuestionable === undefined &&
      this.source === 'manual' && !rdigit.test(number)
    ) {
      this.isQuestionable = true;
    }

    // If the recipient is either questionable or invalid,
    // mark it visually for the user.
    //
    if (this.isQuestionable || this.isInvalid) {
      this.className += ' invalid';
    }
  }

  /**
   * set
   *
   * Set the value of one or more Recipient instance properties
   *
   * @param {Object}  key   Object of key=>value pairs.
   *
   * @param {String}  key   Key string.
   * @param {Any}     value Value, any type.
   */
  Recipient.prototype.set = function(dict) {
    var length = Recipient.FIELDS.length;
    var key;

    for (var i = 0; i < length; i++) {
      key = Recipient.FIELDS[i];
      this[key] = dict[key];
    }
    return this;
  };

  /**
   * clone
   *
   * Create a clone Recipient record. This
   * is used for exposing a Recipient record
   * to external code, specifically in events.
   *
   * @return {Recipient}
   *
   */
  Recipient.prototype.clone = function() {
    return new Recipient(this);
  };

  Recipient.FIELDS = [
    'name', 'number', 'email', 'editable', 'source',
    'type', 'carrier', 'isQuestionable', 'isInvalid', 'isLookupable'
  ];

  Recipient.cast = function(wannabeRecipient) {
    if (wannabeRecipient instanceof Recipient) {
      return wannabeRecipient;
    }

    return new Recipient(wannabeRecipient);
  };

  /**
   * Recipients
   *
   * Create a Recipients list that backs the Recipients.View
   *
   * Recipients list will reject duplicates.
   *
   * @param {Object} setup Required parameters for created a Recipients list.
   *                  - outer, string ID of outer recipient display element.
   *                  - inner, string ID of inner recipient display element.
   *                  - template, Precompiled Template instance.
   */
  function Recipients(setup) {

    if (!setup) {
      throw new Error('`setup` missing');
    }

    if (!setup.template) {
      throw new Error('`setup.template` missing');
    }

    if (!setup.outer) {
      throw new Error('`setup.outer` missing');
    }

    if (!setup.inner) {
      throw new Error('`setup.inner` missing');
    }

    var list = [];

    Object.defineProperties(this, {
      length: {
        get: function() {
          return list.length;
        },
        set: function(value) {
          var oldLength = list.length;
          list.length = value;
          if (value < oldLength) {
            this.render();
          }
          return value;
        }
      },
      list: {
        get: function() {
          return list.slice();
        }
      },
      numbers: {
        get: function() {
          return list.reduce(function(unique, recipient) {
            var value = recipient.number || recipient.email;
            if (!recipient.isInvalid && unique.indexOf(value) === -1) {
              unique.push(value);
            }
            return unique;
          }, []);
        }
      },
      inputValue: {
        // readonly
        get: function() {
          var node = document.getElementById(setup.inner).lastElementChild;
          return (node && node.isPlaceholder) ?
            node.textContent.trim() : '';
        }
      }
    });

    data.set(this, list);
    events.set(this, { add: [], remove: [], modechange: [] });
    view.set(this, new Recipients.View(this, setup));

    this.validator = RecipientValidator.for(this);
  }

  /**
   * on Register an event handler for an "add" or "remove" event.
   *
   * @param  {String}   type Either "add" or "remove".
   * @param  {Function} handler The function to call.
   *
   * @return {Recipients} return the recipients list.
   */
  Recipients.prototype.on = function(type, handler) {
    var handlers = events.get(this);

    if (!handlers[type]) {
      throw new Error('Invalid event type: ' + type);
    }

    handlers[type].push(handler);

    return this;
  };

  /**
   * off Unregister an event handler for an "add" or "remove" event.
   *
   * @param  {String}   type Either "add" or "remove".
   * @param  {Function} handler The reference handler.
   *
   * @return {Recipients} return the recipients list.
   */
  Recipients.prototype.off = function(type, handler) {
    var handlers = events.get(this);

    if (!handlers[type]) {
      throw new Error('Invalid event type: ' + type);
    }

    if (!handler) {
      handlers[type].length = 0;
    } else {
      handlers[type].splice(
        handlers[type].indexOf(handler), 1
      );
    }

    return this;
  };

  /**
   * emit Emit an event for an "add" or "remove".
   *
   * @param  {String}   type Either "add" or "remove".
   * @param  {Function} handler The reference handler.
   *
   * @return {Recipients} return the recipients list.
   */
  Recipients.prototype.emit = function(type) {
    var handlers = events.get(this);
    var args = [].slice.call(arguments, 1);
    var handler, stack;

    if (!handlers[type]) {
      throw new Error('Invalid event type: ' + type);
    }

    stack = handlers[type].slice();

    if (stack.length) {
      while ((handler = stack.pop())) {
        handler.apply(null, args);
      }
    }

    return this;
  };
  /**
   * add Push a new recipient to the current recipients list.
   *
   * @param  {Object} entry { name: '', number: '' }.
   *
   * @return {Recipients} return the recipients list.
   */
  Recipients.prototype.add = function(entry) {
    /*
    Entry {
      name, number [, editable, source ]
    }
    */

    if (entry.number === undefined) {
      throw new Error('recipient entry missing number');
    }

    // _THIS_ "editable" property maps directly to the DOM attribute of
    // the same name and IS NOT a Boolean field.
    entry.editable = entry.editable || 'false';

    // Whitespace cleanup for the fields that are user-entered.
    ['name', 'number', 'email'].forEach(function(field) {
      if (entry[field]) {
        entry[field] = (entry[field] + '').trim();
      }
    });

    var recipient = new Recipient(entry);

    this.validator.validate(recipient).then((validatedRecipient) => {
      var list = data.get(this);

      // Don't bother rejecting duplicates, always add every
      // entry to the recipients list. For reference, see:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=880628
      list.push(Recipient.cast(validatedRecipient));

      this.render();
      this.emit('add');
    });

    return this;
  };

  Recipients.prototype.remove = function(recipOrIndex) {
    var list = data.get(this);
    var index = typeof recipOrIndex === 'number' ?
      recipOrIndex : list.indexOf(recipOrIndex);

    if (index === -1) {
      return this;
    }

    list.splice(index, 1);
    this.emit('remove');

    return this.render(index);
  };

  Recipients.prototype.render = function() {
    // The view's reset method will render and
    // re-apply the event handlers
    view.get(this).reset();
    return this;
  };

  Recipients.prototype.focus = function() {
    view.get(this).focus();
    return this;
  };

  Recipients.prototype.visible = function(type, opts) {
    view.get(this).visible(type, opts || {});
    return this;
  };

  Recipients.prototype.has = function(number) {
    return this.list.some(function(recipient) {
      var value = recipient.number || recipient.email;
      return (!recipient.isInvalid && value === number);
    });
  };

  /**
   * Recipients.View
   *
   * Create a Recipients.View: The DOM structure associated with
   * the Recipients list
   *
   * @param {Object} setup Required parameters for created a Recipients list.
   *                  - outer, string ID of outer recipient display element.
   *                  - inner, string ID of inner recipient display element.
   *                  - template, Precompiled Template instance.
   */

  Recipients.View = function(owner, setup) {
    var inner = document.getElementById(setup.inner);
    var outer = document.getElementById(setup.outer);
    var template = setup.template;
    var nodes = [];
    var clone;
    var outerCss = window.getComputedStyle(outer);

    priv.set(this, {
      owner: owner,
      inner: inner,
      outer: outer,
      template: template,
      active: null,
      nodes: nodes,
      state: {
        isTransitioning: false,
        visible: 'singleline'
      },
      minHeight: parseInt(outerCss.getPropertyValue('min-height'), 10),
      mode: 'singleline-mode'
    });

    clone = inner.cloneNode(true);

    // Used by the "placeholder" accessor to produce
    // new "editable" placeholders, by cloning the
    // first child (element) node
    clone.innerHTML = template.interpolate(new Recipient());
    // empty out the template so :empty matches on placeholders
    clone.firstElementChild.innerHTML = '';

    Object.defineProperties(this, {
      last: {
        get: function() {
          return nodes[nodes.length - 1];
        }
      },
      placeholder: {
        get: function() {
          var node = clone.firstElementChild.cloneNode(true);
          node.isPlaceholder = true;
          return node;
        }
      }
    });

    this.updateMode = Utils.debounce(this.updateMode, 100);

    ['click', 'keypress', 'keyup', 'blur', 'pan'].forEach(function(type) {
      outer.addEventListener(type, this, false);
    }, this);

    new GestureDetector(outer).startDetecting();

    // Set focus on the last "placeholder" element
    this.reset().focus();
  };

  Recipients.View.isFocusable = true;

  Recipients.View.prototype.reset = function() {
    // Clear any displayed text (not likely to exist)
    // Render each recipient in the Recipients object
    // Remove (if exist) and Add event listeners
    this.clear().render();
    return this;
  };
  /**
   * clear
   *
   * Empty the inner element by setting its
   * textContent to an empty string.
   *
   * @return {Recipients.View} Recipients.View instance.
   */
  Recipients.View.prototype.clear = function() {
    priv.get(this).inner.textContent = '';
    return this;
  };
  /**
   * render
   *
   * Render a visual list of recipients followed by
   * an editable placeholder.
   *
   * @param  {Object} opts Optional flags.
   *                       - addPlaceholder, force a placeholder
   *                       to be inserted at the end of the
   *                       rendered recipient list.
   *
   * @return {Recipients.View} Recipients.View instance.
   */
  Recipients.View.prototype.render = function(opts) {
    // ES6: This should use destructuring
    var view = priv.get(this);
    var nodes = view.nodes;
    var inner = view.inner;
    var template = view.template;
    var list = view.owner.list;
    var length = list.length;
    var html = '';

    opts = opts || {};

    opts.addPlaceholder = opts.addPlaceholder === undefined ?
      true : opts.addPlaceholder;

    if (inner.textContent) {
      this.clear();
    }

    // Loop and render each recipient as HTML view
    for (var i = 0; i < length; i++) {
      html += template.interpolate(list[i]);
    }

    // An optionally provided "editable" object
    // may be passed to the render() method.
    // This object will be used to create a
    // "populated" recipient that the user can
    // edit at will.
    if (opts.editable) {
      opts.addPlaceholder = false;
      html += template.interpolate(
        opts.editable
      );
    }

    // If there are any rendered recipients,
    // inject them into the view
    if (html) {
      inner.innerHTML = html;
    }

    // If no specified "editable" recipient,
    // add the placeholder...
    if (opts.addPlaceholder) {
      inner.appendChild(
        this.placeholder
      );
    }

    // Truncate the array of nodes.
    // We must avoid reak the reference to the nodes array
    // which is a local binding to array stored in the WeakMap,
    // as other places expect this to remain the same nodes array
    // that it was when it was initialized. (which is why this
    // isn't a re-assignment to a fresh array)
    nodes.length = 0;


    // When there are no actual recipients in the list
    // ignore elements beyond the first editable placeholder
    if (!list.length) {
      nodes.push.apply(nodes, inner.children[0]);
    } else {
      // .apply will convert inner.children to
      // an array internally.
      nodes.push.apply(nodes, inner.children);
    }

    // Finalize the newly created nodes by registering
    // them with their recipient and updating their flags.
    nodes.forEach(function forEachNode(node, i) {
      // Make all displayed nodes contentEditable=false,
      // and ensure that each node's isPlaceholder flag is
      // set to false.
      //
      // This will make the elements appear "accepted"
      // in the recipients list.
      node.isPlaceholder = false;
      node.contentEditable = false;
      node.setAttribute('role', 'button');

      // The last node should be contentEditable=true
      // and isPlaceholder=true
      if (i === nodes.length - 1) {
        node.isPlaceholder = true;
        node.contentEditable = true;
        node.setAttribute('role', 'textbox');
      } else {
        // Map the node to it's entry in the list
        // (only for actual recipient nodes)
        relation.set(node, list[i]);
      }
    });

    if (view.state.visible === 'singleline' && nodes.length) {
      inner.querySelector(':last-child').scrollIntoView(false);
    }

    this.updateMode();

    return this;
  };

  /**
   * focus
   *
   * Focus on the last editable in the list.
   * Generally, this will be the placeholder.
   *
   * The behaviour of focus in this Recipients View context can
   * be summarized as:
   *
   *   Place the cursor at the end of any existing text in
   *   an explicit node or the current placeholder node by default.
   *
   *   If the node is the current placeholder, make it editable
   *   and set focus.
   *
   * @return {Recipients.View} Recipients.View instance.
   */
  Recipients.View.prototype.focus = function(node) {
    var view = priv.get(this);
    var range = document.createRange();
    var selection = window.getSelection();

    if (Recipients.View.isFocusable) {
      if (!node) {
        node = view.inner.lastElementChild;
        if (!node.isPlaceholder) {
          node = view.inner.appendChild(
            this.placeholder
          );
        }
      }

      if (node && node.isPlaceholder) {
        node.contentEditable = true;
        node.focus();
      }

      range.selectNodeContents(node);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // scroll to the bottom of the inner view
      view.inner.scrollTop = view.inner.scrollHeight;
    }

    this.updateMode();

    return this;
  };

  /**
   * Checks whether recipients view mode (single or multi line) has changed
   * since previous check and notifies listeners with 'modechange' event in this
   * case.
   */
  Recipients.View.prototype.updateMode = function() {
    var view = priv.get(this);

    var mode = view.inner.scrollHeight > view.minHeight ?
        'multiline-mode' : 'singleline-mode';

    if (view.mode !== mode) {
      view.mode = mode;

      // the list in "singleline-mode" should only have "singleline" view
      if (mode === 'singleline-mode' && view.state.visible === 'multiline') {
        this.visible('singleline', {
          refocus: this
        });
      }

      view.owner.emit('modechange', mode);
    }
  };

  var rtype = /^(multi|single)line$/;

  Recipients.View.prototype.visible = function(type, opts) {
    var view = priv.get(this);
    var state = view.state;
    var error = 'visible "type" (multiline or singleline)';

    opts = opts || {};

    if (!type) {
      throw new Error('Missing ' + error);
    }

    if (!rtype.test(type)) {
      throw new Error('Invalid ' + error);
    }

    // Requests to change the visible area
    // can interrupt transitions.
    if (state.visible !== type) {
      state.isTransitioning = false;
    }

    // Requests to change the visible area
    // to the same state that it's in, while
    // still transitioning to that state, are
    // ignored.
    if (state.isTransitioning) {
      return this;
    }

    // Requests to change the visible area
    // to the same state that it's in are
    // ignored.
    //
    // This can easily be the case when user
    // is scrolling the recipients list and
    // GestureDetector assumes the scroll is
    // a "pan" event.
    // (The physical act is identical)
    if (state.visible === type) {
      return this;
    }

    // Once the transition has ended, the set focus to
    // the last child element in the recipients list view
    view.outer.addEventListener('transitionend', function te() {
      var last = view.inner.lastElementChild;
      var previous;

      if (Navigation.isCurrentPanel('composer') &&
          state.visible === 'singleline') {
        while (last !== null && last.isPlaceholder) {
          previous = last.previousElementSibling;
          if (!last.textContent) {
            last.parentNode.removeChild(last);
          }
          last = previous;
        }

        if (opts.refocus) {
          opts.refocus.focus();
        }
      } else if (state.visible === 'multiline' && last !== null) {
        last.scrollIntoView(true);
      }

      state.isTransitioning = false;
      this.removeEventListener('transitionend', te, false);
    });

    // Commence the transition
    //
    // 1. Store the current transition states
    //
    state.visible = type;
    state.isTransitioning = true;
    //
    // 2. Set a "multiline" or "singleline" class.
    //
    // Instead of making multiple calls to classList.*
    // functions, pave over the className property.
    view.outer.className = type;
    view.inner.className = type;

    return this;
  };

  /**
   * handleEvent
   *
   * Single method for event handler delegation.
   *
   * @return {Undefined} void return.
   */
  Recipients.View.prototype.handleEvent = function(event) {
    var view = priv.get(this);
    var owner = view.owner;
    var isPreventingDefault = false;
    var isAcceptedRecipient = false;
    var isEdittingRecipient = false;
    var isDeletingRecipient = false;
    var isLookupable = false;
    var target = event.target;
    var keyCode = event.keyCode;
    var editable = 'false';
    var lastElement = view.inner.lastElementChild;
    var typed, recipient, length, previous;

    // If the user moved away from the recipients field
    // and has now returned, we need to restore "focusability"
    Recipients.View.isFocusable = true;

    // All keyboard events will need some information
    // about the input that the user typed.
    if (event.type === 'keypress' || event.type === 'keyup') {
      typed = target.textContent.trim();
      length = typed.length;
    }

    switch (event.type) {

      case 'pan':
        // Switch to multiline display when:
        //
        //  1. The recipients in the list have caused the
        //      container to grow enough to require the
        //      additional viewable area and the view is singleline
        //      mode originally.
        //  2. The user is "pulling down" the recipient list.

        // #1
        if (view.state.visible === 'singleline' &&
            view.inner.scrollHeight > view.minHeight) {
          // #2
          if (event.detail.absolute.dy > 0) {
            this.visible('multiline');
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        break;

      case 'click':

        // 1. Edit or Delete?
        // The target is a recipient view node
        if (target.parentNode === view.inner) {

          // Could be one of:
          //   - Adding new, in progress
          //   - Editting recipient
          //
          if (target.isPlaceholder) {
            return;
          }

          // If Recipient is clicked while another is actively
          // being editted, save the in-edit recipient before
          // transforming the target into an editable recipient.
          typed = lastElement && lastElement.isPlaceholder ?
            lastElement.textContent.trim() : '';

          if (typed) {
            owner.add({
              name: typed,
              number: typed,
              source: 'manual'
            }).focus();
          }

          // If the target already has focus, then prompt to
          // delete the recipient from the list.
          //
          recipient = relation.get(target);

          if (recipient) {
            // If the target was added via Contacts, prompt to delete.
            if (recipient.source === 'contacts') {
              //
              // 1.a Delete Mode
              //
              Recipients.View.prompts.remove(recipient, function(isConfirmed) {
                // When the editable placeholder is in "zero width" mode,
                // it's possible to accidentally tap a recipient when the
                // intention is to tap the to-field area around the recipient
                // list, which will correctly prompt the user to remove the
                // recipient. Since there is no way to unambiguously detect
                // the user's intention, always handle "Remove" and "Cancel"
                // in an intuitive way.
                //
                //   1. "Remove" will result in the removal of the
                //      of the recipient from the list, and focus will
                //      be automattically set on the editable placeholder.
                //
                //   2. "Cancel" will result in no removal, and focus will
                //      be automattically set on the editable placeholder.
                //
                //   Both cases will result in the removal of the
                //   "no-l-r-padding-margin" class from the editable
                //   placeholder (via focus()).
                //
                // #1
                if (isConfirmed) {
                  owner.remove(
                    relation.get(target)
                  );
                  this.reset();
                }
                Recipients.View.isFocusable = true;

                // #1 & #2
                this.focus();

              }.bind(this));

            // If the target was added Manually, move to edit mode
            } else {
              //
              // 1.b Edit Mode
              //
              isEdittingRecipient = true;

              typed = recipient.number || recipient.name;
              editable = 'true';

              owner.remove(recipient);

              target = view.inner.lastElementChild;
              target.textContent = typed;

              this.visible('singleline', {
                refocus: target
              });
            }
          }
        } else {
          //
          // 2. Focus for fat fingering!
          //
          if (view.state.visible !== 'singleline') {
            this.visible('singleline', {
              refocus: this
            });
          } else {
            this.focus();
          }
          return;
        }

        break;

      case 'keyup':

        // Last character is a semi-colon, treat as an
        // "accept" of this recipient.
        if (typed && (typed[length - 1] === ';' || typed[length - 1] === ',')) {
          isAcceptedRecipient = true;
          isPreventingDefault = true;

          typed = typed.replace(/[;,]$/, '');

          // Display the actual typed text that we're
          // going to accept as a recipient (trimmed)
          target.textContent = typed;
        }

        // When a single, non-semi-colon character is
        // typed into to the recipients list input,
        // slide the the list upward to "single line"
        // set focus to recipient
        if (!isAcceptedRecipient && (typed && typed.length >= 1)) {
          this.visible('singleline', {
            refocus: target
          });
        }

        if (!typed && keyCode === event.DOM_VK_BACK_SPACE) {
          isPreventingDefault = true;
          isDeletingRecipient = true;
        }

        this.updateMode();
        break;

      case 'keypress':

        // <BACKSPACE>
        //
        // When the backspace key is pressed in an empty placeholder
        // attempt to go back to the previous entry and edit that
        // recipient as if it were a newly added entry.
        if (keyCode === event.DOM_VK_BACK_SPACE) {
          previous = target.previousSibling;

          if (!typed && previous) {
            recipient = relation.get(previous);

            // If the recipient to the immediate left is a
            // known Contact, added either by Activity
            // or via search contact results, remove it
            // from the list
            //
            if (previous.dataset.source === 'contacts') {
              isPreventingDefault = true;
              isDeletingRecipient = true;

              view.owner.remove(recipient);

            } else if (previous.dataset.source === 'manual') {
              // Only manually typed entries may be editted directly
              // in the recipients list view.

              isEdittingRecipient = true;
              isPreventingDefault = true;

              target = previous;

              // Remove the placeholder that received the "keypress"
              view.inner.removeChild(
                view.inner.lastElementChild
              );

              // Remove the last entry from the recipients list.
              // This will (or won't) be re-added by the user
              // when they are finished editting and have
              // "accepted" the recipient entry
              data.get(view.owner).pop();
              view.owner.emit('remove');
            }
          }
        }

        // <ENTER> (Appears to be 13 on keyboard and 14 on VK)
        // <TAB>
        if (
            (keyCode === 13 || keyCode === event.DOM_VK_ENTER) ||
            (keyCode === event.DOM_VK_TAB)
          ) {
          if (typed) {
            // Always prevent "multiline' entry when <ENTER> is pressed
            // Always prevent lost recipients when <TAB> is pressed
            isPreventingDefault = true;

            // Treat <ENTER> the same as accepting the entry as
            // a valid recipient
            if (target.parentNode === view.inner) {

              // Treat <TAB> as nothing.
              if (keyCode !== event.DOM_VK_TAB) {

                isAcceptedRecipient = true;
                isLookupable = true;

                // Display the actual typed text that we're
                // going to accept as a recipient (trimmed)
                target.textContent = typed;
              }
            }
          }
        }
        break;
    }

    if (isAcceptedRecipient && typed) {
      // Push the accepted input into the recipients list
      view.owner.add({
        name: typed,
        number: typed,
        editable: editable,
        source: 'manual',
        role: editable ? 'textbox' : 'button',
        isLookupable: isLookupable
      }).focus();

      // Clear the displayed list
      // Render the recipients as a fresh list
      // Set focus on the very placeholder item.
      this.render().focus();
    }

    if (isDeletingRecipient) {
      this.render().focus();
    }

    if (isEdittingRecipient) {
      // Make the last added entry "editable"
      target.contentEditable = true;
      target.setAttribute('role', 'textbox');
      target.isPlaceholder = true;
      this.focus(target);
    }

    if (isPreventingDefault) {
      event.preventDefault();
    }
  };

  Recipients.View.prompts = {
    remove: function(recipient, callback) {
      callback = typeof callback === 'function' ? callback : () => {};

      var bodyTemplate = SharedComponents.phoneDetails({
        number: recipient.number,
        type: recipient.type,
        carrier: recipient.carrier
      });

      var title = document.createElement('bdi');
      title.textContent = recipient.name || recipient.number;

      Utils.confirm(
        { raw: bodyTemplate.toDocumentFragment() },
        { raw: title },
        { text: 'remove', className: 'danger' }
      ).then(() => callback(true), () => callback(false));

      Recipients.View.isFocusable = false;
    }
  };

  exports.Recipients = Recipients;

}(this));
