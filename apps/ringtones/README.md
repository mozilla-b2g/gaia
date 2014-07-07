# Gaia Ringtones

This app is responsible for managing ringtones on Firefox OS. There are three
entry points into the ringtones app:

### Management

Located in `manage.html`, ringtone management can be accessed from
`Settings -> Sound -> Manage Ringtones`. This lists all ringtones (built-in and
user-created), and allows deleting or sharing them as appropriate. You can also
create new ringtones, which will initiate a `'pick'` activity and then
effectively open the ringtone app's `'share'` activity.

### Pick

Located in `pick.html`, this allows other apps to choose a ringtone. Notably,
this is used in the Settings app under `Settings -> Sound -> Ringer` and
`Settings -> Sound -> Alert Tone`. The pick activity expects a type of
`'ringtone'` or `'alerttone'`; whichever type is requested will be shown first
in the list. After that, we show custom ringtones, and then ringtones of
unasked-for types.

### Share

Located in `share.html`, this allows other apps to create a new ringtone. This
is also used in reverse to finalize creation of a ringtone from the ringtones
management screen.
