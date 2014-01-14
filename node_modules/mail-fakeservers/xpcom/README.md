We are reusing Thunderbird's IMAP and SMTP fake-server implementations.
Particular thanks to Joshua Cranmer who has been the driving force behind their
development.  Thanks also to all Thunderbird and MailNews contributors who have
helped move them along through direct development or by reviewing Joshua's
work.

For tracking purposes, these files are maintained in the
"thunderbird-fakeserver-vendor" vendor branch.  When we take an update, we
commit the new changed files, including the upstream hg hash in the commit
message.  We then merge the changes to this branch into whatever branch we
are developing against that needs the changes.  Moves / renames will probably
be a mess.

To perform the update, please run the "pull-files-from-thunderbird" script in
this directory.  If you need more files, please update the script and then run
it.

NOTE: Thunderbird code is GPL/LGPL/MPL tri-licensed unless otherwise labeled.

NOTE: Some files are not from Thunderbird.  Namely:
- subscript/httpd.js: this is from mozilla-central/network/test/httpserver
