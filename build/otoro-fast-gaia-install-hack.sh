#!/bin/sh

# This shell script upload busybox to the device and performs some
# symbolic links to enable fast installation on the device.

# Remount file system with read/write permissions
adb shell "mount -o rw,remount -t rootfs /"
adb push busybox-armv6l /sbin/busybox
adb shell "chmod 555 /sbin/busybox"

# Perform the symbolic links
adb push ./links4busybox.sh /sbin/
adb shell "sh /sbin/links4busybox.sh"
adb shell "rm /sbin/links4busybox.sh"

# Back the rm utility up and replace it by busybox
if [ ! -f /system/bin/rm.bk ];
then
    adb shell "mv /system/bin/rm /system/bin/rm.bk"
fi
adb shell "ln -s /sbin/busybox /system/bin/rm"

# Remount file system with read-only permissions
adb shell "mount -o ro,remount -t rootfs /"

