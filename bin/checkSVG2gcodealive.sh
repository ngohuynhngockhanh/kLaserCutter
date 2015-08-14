#!/bin/bash 

process="svg2gcode.js"

while true;
do
	if ps | grep -v grep | grep $process > /dev/null         
	then                 
		echo "Process $process is running"         
	else        
		echo "Start SVG2gcode again"
		cd /home/laser && ./svg2gcode.js > ./l.log 2> ./n.log
	fi
	sleep 10
done
