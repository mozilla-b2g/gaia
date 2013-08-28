function debug(...args) {
  if (!DEBUG)
    return;
  if (!debug.startTime)
    debug.startTime = Date.now();
  args.unshift('[Locked Content]', Date.now() - debug.startTime);
  console.log.apply(console, args);
}

function $(id) { return document.getElementById(id); }

function _(id, args) {
  return navigator.mozL10n.get(id, args);
}

// Show a dialog with one or two buttons
function showDialog(options) {
  var dialog = document.createElement('form');
  dialog.setAttribute('role', 'dialog');
  dialog.dataset.type = 'confirm';
  var section = document.createElement('section');
  dialog.appendChild(section);

  // Display an optional title
  if (options.title) {
    var title = document.createElement('h1');
    title.textContent = options.title;
    section.appendChild(title);
  }

  // Display the dialog message
  var msg = document.createElement('p');
  msg.textContent = options.message;
  section.appendChild(msg);

  // If there are details, display those in a separate, smaller paragraph
  if (options.details) {
    var details = document.createElement('p');
    var small = document.createElement('small');
    small.textContent = options.details;
    details.appendChild(small);
    section.appendChild(details);
  }

  // Now the buttons
  var menu = document.createElement('menu');
  dialog.appendChild(menu);

  // Add the cancel button if there is one
  if (options.cancelCallback) {
    var cancelButton = document.createElement('button');
    menu.appendChild(cancelButton);
    cancelButton.textContent = options.cancelText || _('cancel');
    cancelButton.onclick = function(e) {
      close(e);
      options.cancelCallback();
    };
  }

  if (options.okCallback) {
    var okButton = document.createElement('button');
    menu.appendChild(okButton);
    okButton.textContent = options.okText || _('ok');
    if (options.danger) {
      okButton.classList.add('danger');      // scary red color
    }
    else if (!options.cancelCallback) {
      okButton.classList.add('recommend');   // default safe color
    }
    okButton.onclick = function(e) {
      close(e);
      options.okCallback();
    };
  }

  // If there is only one button, make it full-size
  if (okButton && !cancelButton)
    okButton.classList.add('full');
  if (cancelButton && !okButton)
    cancelButton.classList.add('full');

  // show the dialog
  document.body.appendChild(dialog);

  function close(e) {
    document.body.removeChild(dialog);
    e.preventDefault();
    e.stopPropagation();
  }
}
