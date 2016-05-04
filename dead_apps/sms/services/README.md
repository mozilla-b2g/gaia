# The layers in the Messages application

## Terms explanation

We'll define different layers whose interfaces managed by the Bridge (aka [threads.js](https://github.com/gaia-components/threads/)):

* Controllers are really tied to a specific view. They'll encapsulate
  view-specific business logic. Ideally they live in a worker managed by the
  Bridge, but this is not decided yet -- they might as well live in the same
  context as the view.

* Services define high-level semantics to access the model. They are the only
  interfaces that can be directly called by the views. Ideally one user action
  has one matching service method.

  Ideally a service doesn't call another service and calls only managers.
  (but we can relax this rule in our case).

  A Service will live in a Shared Worker: it will be shared accross all
  instances of the application.

  All together they form the Service Layer.

* Managers define lower-level semantics. They'll be called by the Service layer.
  Ideally their responsabilities are well-defined and they don't call each other.

  It's not clear yet whether they'll live in their own Shared Worker or if
  they'll just be JS files imported into the service's shared workers.

* Shims define interfaces to access [mozAPI](https://developer.mozilla.org/en-US/docs/WebAPI) that are not available in workers.
  Ideally they expose very similar APIs than their mozAPI counterparts because
  their goal is to eventually disappear.

  Shims usually live in a window context (an iframe) so that they can access
  mozAPIs.

## Controllers

## The Service Layer
### ConversationService

This service manages everything related to directly interacting with
conversations and messages.

Here are the operations needed:

* Get All Conversations
  - used in InboxView
  - contains everything needed to display the Inbox (so including the "body", the "type", the "draft" and the "contact information".
* Delete Conversations
  -  used in InboxView
* Delete Messages
  -  used in ConversationView (and can in turn delete Conversations)
* Mark Conversations As Read/Unread
  -  Used in InboxView and ConversationView
* Load 1 Conversation + its messages + contact(s) information(s)
  -  Used in ConversationView
* send an event when a message has been changed and the local IDB (if existing) has been updated.
* send an event when receiving a message and the local IDB (if existing) has been updated.
* Load 1 Message
  -  Used in ReportView and GroupView
  - (If these views are really part of the ConversationPanel, maybe we don't need this operation)
* find a conversation from number
  - (if the redirection (new message -> conversation) is done from the service worker, this will be used from the service worker)

### MessagingService

This service will be used when a view does actions related to messaging functionality,
especially sending messages.

Here are the operations for this service:

* send a message
  - used from ConversationView, NewMessageView, ReportView
  - this service may use other services (eg: ConversationService to change model --
    or underlying Manager ? or same JS file in both services that could do this ?)
* retrieve a non-retrieved MMS.
* resend an errored message
* the various events coming from the mozMobileMessage shim
* onSmsReceived (not an event, an actual method that will be called when we get
  the system message from an hidden page or the SW)
  - may use other services too
  - or other services may listen to events resulting from this... to be decided.

### ContactService

This service handles all contact lookup.

Here are the operations:

* search in contacts
  - used in New Message View
* search in unknown contacts
  - might use methods from ConversationManager

This will use a shim for mozContacts.

### NotificationService

This service handles notification clicks.

### DraftsService

This service can save/modify drafts.

## The Shims
### ActivityShim

This shim handles [activity](https://developer.mozilla.org/en-US/docs/Web/API/Web_Activities/) requests. It is responsible for setting the system
message handler and doing the necessary work to decide which panel to load.

### MobileMessagingShim

This shim is a proxy over the mozMobileMessaging API.
