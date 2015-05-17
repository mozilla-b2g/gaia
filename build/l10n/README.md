# mozL10n deprecation warnings

Git's `pre-commit` hook will abort the commit if one of the changed files 
contains a reference to `mozL10n.get`.  Bug 1020138 [1] tracks the removal of 
this API.  [2] has more information about how to write code without it.

[1]: https://bugzilla.mozilla.org/show_bug.cgi?id=1020138
[2]: https://developer.mozilla.org/en-US/Firefox_OS/Developing_Gaia/localization_code_best_practices#Do_not_use_mozL10n.get

If you're editing a file which already uses `mozL10n.get` and you can't remove 
it easily, consider adding the file name to `build/l10n/xfail.list` to bypass 
the hook.  The file needs to be alphabetically sorted with `LC_ALL=C sort`.
