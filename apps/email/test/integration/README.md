# README

This directory contains integration tests for the Email app.

Some tests require real live accounts to run. You must provide the
account information in a JSON file and use the TESTVARS environment
variable to point to it. If you don't then these tests will get
skipped with a message in the console that's not particularly obvious
if you're not looking for it.

Specify the testvars file like this:

    make test-integration TESTVARS=mytestvars.json APP=email

If you don't specify the TESTVARS, it'll default to "testvars.json".
It looks for files relative to the gaia/ folder. You can specify
absolute paths or relative paths. You can have multiple files with
different credentials in each.


## Setting up credentials

The testvars file is a JSON file consisting of a mapping from app name
to object with variables for that app.

For example:

    {
      "Email": {
        "launch_name": "John Doe",
        "launch_email": "john@example.com",
        "launch_password": "ou812"
      }
    }

The three launch_* keys are used in the launch test and correspond to
the fields in the account creation card.

See the output in the console or read the test code for which fields
are required for each test.

