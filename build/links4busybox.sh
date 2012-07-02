# Thanks to jlebar (https://github.com/jlebar) for the suggestion
for x in `busybox --list`; do ln -s /sbin/busybox /sbin/$x; done
