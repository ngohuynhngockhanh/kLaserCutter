#!/bin/bash 
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
process="svg2gcode.js"
#mount ramdisk
mount -t tmpfs -o size=10M tmpfs ./../upload/ 
#insmod sha1_generic
cd $DIR && cd kernel && insmod sha1_generic.ko
while true;
do
	if ps | grep -v grep | grep $process > /dev/null         
	then                 
		echo "Process $process is running"         
	else        
		echo "Start SVG2gcode again"
		cd $DIR && cd ../ && ./svg2gcode.js > /dev/null 2>&1 &
	fi
	sleep 10
done
