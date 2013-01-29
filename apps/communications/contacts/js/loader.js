
function loadScripts() {
  var scripts = [
    "/contacts/js/confirm_dialog.js",
    "/contacts/js/activities.js",
    "/contacts/js/fb/fb_data.js",
    "/contacts/js/utilities/utils.js",
    "/contacts/js/fb/fb_init.js",
    "/shared/js/mouse_event_shim.js",
    "/shared/js/async_storage.js",
    "/contacts/js/utilities/templates.js",
    "/contacts/js/utilities/import_sim_contacts.js",
    "/contacts/js/utilities/image_loader.js",
    "/dialer/js/telephony_helper.js",
    "/contacts/js/navigation.js",
    "/contacts/js/contacts_list.js",
    "/contacts/js/search.js",
    "/contacts/js/contacts_details.js",
    "/contacts/js/contacts_form.js",
    "/contacts/js/contacts_shortcuts.js",
    "/contacts/js/contacts.js",
    "/contacts/js/sms_integration.js",
    "/contacts/js/fixed_header.js",
    "/contacts/oauth2/js/parameters.js",
    "/contacts/js/fb/fb_utils.js",
    "/contacts/js/fb/fb_query.js",
    "/contacts/js/fb_extensions.js",
    "/contacts/js/fb/fb_contact_utils.js",
    "/contacts/js/fb/fb_contact.js",
    "/contacts/js/fb/fb_link.js",
    "/contacts/js/fb/fb_messaging.js",
    "/contacts/js/contacts_settings.js",
    "/contacts/js/value_selector.js"
  ];

  var template = '';
  var head= document.getElementsByTagName('head')[0];
  var fragment = document.createDocumentFragment();
  scripts.forEach(function(scriptSrc) {
    var script= document.createElement('script');
    script.type= 'text/javascript';
    script.src= scriptSrc;
    script.setAttribute('defer', true);
    fragment.appendChild(script);
  });

  head.appendChild(fragment);
}

window.addEventListener('load', function loaded() {
  document.body.classList.remove('hide');
  loadScripts();
});