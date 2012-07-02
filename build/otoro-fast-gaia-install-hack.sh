#!/bin/sh

# Problems, ask for Guillermo or Salva

adb shell "mount -o rw,remount -t rootfs /"
adb push busybox /sbin/
adb shell "chmod 555 /sbin/busybox"

adb shell "ln -s /sbin/busybox /sbin/xargs"
adb shell "ln -s /sbin/busybox /sbin/tar"
adb shell "ln -s /sbin/busybox /sbin/sha1sum"
adb shell "ln -s /sbin/busybox /sbin/find"

if [ ! -f /system/bin/rm.bk ];
then
    adb shell "mv /system/bin/rm /system/bin/rm.bk"
fi
adb shell "ln -s /sbin/busybox /system/bin/rm"
adb shell "mount -o ro,remount -t rootfs /"

