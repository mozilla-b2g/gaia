#!/system/bin/sh

for x in `busybox --list`; do ln -s /sbin/busybox /sbin/$x; done
