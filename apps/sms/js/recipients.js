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

  var rtrigger = /[a-zA-Z0-9\+\(\*]/;


  function Recipient(opts) {
    opts = opts || {};
    this.name = opts.name || opts.number || '';
    this.number = opts.number || '';
    this.email = opts.email || '';
    this.editable = opts.editable || 'true';
    this.source = opts.source || 'manual';
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

  Recipient.FIELDS = ['name', 'number', 'email', 'editable', 'source'];

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
   *                  - template, Precompiled Utils.Template instance.
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
          list.length = value;
          this.render();
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
          return list.map(function(recipient) {
            return recipient.number || recipient.email;
          });
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
    view.set(this, new Recipients.View(this, setup));
    events.set(this, { add: [], remove: [] });
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
        handler(args);
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
    var list = data.get(this);
    var isSamePhoneNumber;
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

    isSamePhoneNumber = function(recipient) {
      return recipient.number !== entry.number;
    };

    // Check that this is not a duplicate, if not,
    // push into the recipients list
    if (list.every(isSamePhoneNumber)) {
      list.push(new Recipient(entry));
      this.emit('add', list.length);
    }

    // Render the view
    this.render();

    return this;
  };

  /**
   * update Update/replace a recipient at a specific index in the list.
   *
   * @param  {Number} recipOrIndex Recipient or Index to update.
   * @param  {Object} entry { name: '', number: '' }.
   *
   * @return {Recipients} return the recipients list.
   */
  Recipients.prototype.update = function(recipOrIndex, entry) {
    var list = data.get(this);
    var index = typeof recipOrIndex === 'number' ?
      recipOrIndex : list.indexOf(recipOrIndex);

    // Use the normalization of new Recipient() to
    // correct any missing, but required fields.
    list[index].set(new Recipient(entry));

    return this.render();
  };

  Recipients.prototype.remove = function(recipOrIndex) {
    var list = data.get(this);
    var index = typeof recipOrIndex === 'number' ?
      recipOrIndex : list.indexOf(recipOrIndex);

    list.splice(index, 1);
    this.emit('remove', list.length);

    return this.render();
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

  Recipients.prototype.visible = function(type) {
    view.get(this).visible(type);
    return this;
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
   *                  - template, Precompiled Utils.Template instance.
   */

  Recipients.View = function(owner, setup) {
    var inner = document.getElementById(setup.inner);
    var outer = document.getElementById(setup.outer);
    var template = setup.template;
    var nodes = [];
    var clone;

    priv.set(this, {
      owner: owner,
      inner: inner,
      outer: outer,
      template: template,
      active: null,
      nodes: nodes,
      relation: new WeakMap(),
      gesture: new GestureDetector(outer),
      state: {
        isTransitioning: false,
        visible: 'singleline'
      },
      dims: {
        inner: {
          height: 0,
          width: 0
        },
        outer: {
          height: 0,
          width: 0
        }
      }
    });

    clone = inner.cloneNode();

    // Used by the "placeholder" accessor to produce
    // new "editable" placeholders, by cloning the
    // first child (element) node
    clone.innerHTML = template.interpolate(new Recipient());

    Object.defineProperties(this, {
      last: {
        get: function() {
          return nodes[nodes.length - 1];
        }
      },
      placeholder: {
        get: function() {
          var node = clone.firstElementChild.cloneNode();
          node.isPlaceholder = true;
          node.setAttribute('x-inputmode', 'verbatim');
          return node;
        }
      }
    });

    // Focus on the last "placeholder" element
    this.reset().focus();
  };

  Recipients.View.prototype.reset = function() {
    // Clear any displayed text (not likely to exist)
    // Render each recipient in the Recipients object
    // Remove (if exist) and Add event listeners
    this.clear().render().observe();
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
    var relation = view.relation;
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
      html += template.interpolate(list[i], {
        // Names from contacts don't need to be escaped.
        // Doing so results in displayed name transformations,
        // ie. "Mike O'Malley" => "Mike O&apos;Malley"
        safe: list[i].source === 'contacts' ? ['name'] : []
      });
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

    // .apply will convert inner.children to
    // an array internally.
    nodes.push.apply(nodes, inner.children);

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

      // The last node should be contentEditable=true
      // and isPlaceholder=true
      if (i === nodes.length - 1) {
        node.isPlaceholder = true;
        node.contentEditable = true;
      } else {
        // Map the node to it's entry in the list
        // (only for actual recipient nodes)
        relation.set(node, list[i]);
      }
    });

    if (view.state.visible === 'singleline') {
      inner.querySelector(':last-child').scrollIntoView(false);
    }

    return this;
  };

  /**
   * focus
   *
   * Focus on the last editable in the list.
   * Generally, this will be the placeholder
   *
   * @return {Recipients.View} Recipients.View instance.
   */
  Recipients.View.prototype.focus = function(node) {
    var view = priv.get(this);
    var range = document.createRange();
    var selection = window.getSelection();

    node = node || view.inner.lastElementChild;

    if (node && node.isPlaceholder) {
      node.contentEditable = true;
      node.focus();
    }

    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    return this;
  };

  var rtype = /^(multi|single)line$/;

  Recipients.View.prototype.visible = function(type) {
    var view = priv.get(this);
    var state = view.state;
    var error = 'visible "type" (multiline or singleline)';

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
      var last;
      if (state.visible === 'singleline') {
        last = view.inner.querySelector(':last-child');
        last.focus();
        last.scrollIntoView(true);
      }
      state.isTransitioning = false;
      view.outer.removeEventListener('transitionend', te, true);
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
   * observe
   *
   * Add and Remove all the listeners.
   *
   * @return {Recipients.View} Recipients.View instance.
   */
  Recipients.View.prototype.observe = function() {
    var view = priv.get(this);
    var outer = view.outer;
    var gesture = view.gesture;

    gesture.stopDetecting();

    ['click', 'keypress', 'keyup', 'blur', 'pan'].forEach(function(type) {

      // Bound handlers won't exist on the first run...
      if (this.observe.handler) {
        // Remove the old delegate to prevent zombie events
        outer.parentNode.removeEventListener(
          type, this.observe.handler, false
        );
      }

      // Create a new bound delegation handler:
      // |this| => Recipients.View.prototype.handleEvent
      // (Only if one doesn't exist)
      if (this.observe.handler === null) {
        this.observe.handler = this.handleEvent.bind(this, priv);
      }

      // Register the bound delegation handler
      outer.parentNode.addEventListener(
        type, this.observe.handler, false
      );
    }, this);

    gesture.startDetecting();

    return this;
  };

  Recipients.View.prototype.observe.handler = null;

  /**
   * handleEvent
   *
   * Single method for event handler delegation.
   *
   * @return {Undefined} void return.
   */
  Recipients.View.prototype.handleEvent = function(proof, event) {
    var view = priv.get(this);
    var relation = view.relation;
    var owner = view.owner;
    var isPreventingDefault = false;
    var isAcceptedRecipient = false;
    var isEdittingRecipient = false;
    var target = event.target;
    var keyCode = event.keyCode;
    var editable = 'false';
    var typed, recipient, length, last, list, previous;

    if (proof !== priv) {
      throw new Error(
        '`Recipients.View.prototype.handleEvent` cannot be called directly'
      );
    }

    // All keyboard events will need some information
    // about the input that the user typed.
    if (event instanceof KeyboardEvent) {
      typed = target.textContent.trim();
      length = typed.length;
    }

    // Make sure that height of the displayed list is
    // being tracked. If no previously known height is set,
    // or it's just zero, update it.
    if (!view.dims.inner.height) {
      view.dims.inner.height = view.inner.offsetHeight;
    }

    if (!view.dims.outer.height) {
      view.dims.outer.height = view.outer.offsetHeight;
    }

    switch (event.type) {

      case 'pan':
        // If there are recipients in the list and the
        // pan event is "pulling down", then switch the
        // view to multiline display
        if (owner.length > 1) {
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

          // If Recipient is clicked while another is actively
          // being editted, save the in-edit recipient before
          // transforming the target into an editable recipient.
          typed = view.inner.lastElementChild.textContent.trim();

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
              Recipients.View.prompts.remove(target, function(result) {
                if (result.isConfirmed) {
                  owner.remove(
                    relation.get(target)
                  );
                  this.reset().focus();
                }
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
            }
          }
        } else {
          // 2. Focus for fat fingering!
          //

          this.focus();
          return;
        }

        break;

      case 'keyup':

        // Last character is a semi-colorn treat as an
        // "accept" of this recipient.
        if (typed && typed[length - 1] === ';') {
          isAcceptedRecipient = true;
          isPreventingDefault = true;

          typed = typed.replace(/;$/, '');

          // Display the actual typed text that we're
          // going to accept as a recipient (trimmed)
          target.textContent = typed;
        }

        // When a single, non-semi-colon character is
        // typed into to the recipients list input,
        // slide the the list upward to "single line"
        if (!isAcceptedRecipient && (typed && typed.length === 1)) {
          this.visible('singleline');
        }



        break;

      case 'keypress':

        // <BACKSPACE>
        //
        // When the backspace key is pressed in an empty placeholder
        // attempt to go back to the previous entry and edit that
        // recipient as if it were a newly added entry.
        if (keyCode === event.DOM_VK_BACK_SPACE) {
          if (!typed) {
            previous = target.previousSibling;
            list = data.get(owner);

            // Only manually typed entries may be editted directly
            // in the recipients list view.
            if (previous &&
              (list.length && list[list.length - 1].source === 'manual')) {

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

                // Display the actual typed text that we're
                // going to accept as a recipient (trimmed)
                target.textContent = typed;
              }
            }
          }
        }
        break;
    }

    if (isAcceptedRecipient) {
      if (typed) {
        // Push the accepted input into the recipients list
        view.owner.add({
          name: typed,
          number: typed,
          editable: editable,
          source: 'manual'
        });

        // Clear the displayed list
        // Render the recipients as a fresh list
        // Set focus on the very placeholder item.
        this.render().focus();
      }
    }

    if (isEdittingRecipient) {
      // Make the last added entry "editable"
      target.contentEditable = true;
      target.isPlaceholder = true;
      this.focus(target);
    }

    if (isPreventingDefault) {
      event.preventDefault();
    }
  };

  Recipients.View.prompts = {
    remove: function(candidate, callback) {
      var response = {
        isConfirmed: false,
        recipient: candidate
      };
      var message = navigator.mozL10n.get('recipientRemoval', {
        recipient: candidate.textContent.trim()
      });
      // If it's a contact we should ask to remove
      if (confirm(message)) {
        response.isConfirmed = true;
      }

      callback(response);
    }
  };

  // Recipients.View.events = {
  //   pan: function(absolute) {
  //     if (absolute.dy > 0) {
  //       this.visible('multiline');
  //     }
  //   }
  // };

  exports.Recipients = Recipients;

}(this));
