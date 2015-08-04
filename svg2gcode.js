#!/usr/bin/env node
//require
var	express		=	require('express'),
	siofu 		= 	require("socketio-file-upload")
	app        	= 	express(),
	fs         	= 	require('fs'),
	exec 		= 	require('child_process').exec,
	server		=	require('http').createServer(app),
    io			=	require('socket.io').listen(server),
	argv		=	require('optimist').argv,
	phpjs		= 	require('phpjs'),
	Infinity	=	1e90,
	exec 		=	require('child_process').exec,
	svg2gcode	=	require('./lib/svg2gcode'),
	serialport	=	require("serialport"),
	Vec2		=	require('vec2'),
	SerialPort	= 	serialport.SerialPort,
	serialPort	= 	new SerialPort("/dev/ttyS0", {
					baudrate: 115200,
					parser: serialport.parsers.readline("\n")
				});

exec('mount -t tmpfs -o size=10M tmpfs ./upload/');	//mount ramdisk
				
var	gcodeQueue	= 	[],
	gcodeDataQueue= [],
	SVGcontent	=	"",
	currentQueue=	0,
	currentDistance=0,
	maxDistance	=	8,							//queue has enough elements to run enough 8mm
	minQueue	=	4,							// queue has at least 5 elements
	maxQueue    =	20,							//queue has at maximum 20 elements
	timer1		=	phpjs.time(),
	timer2		=	0,
	machineRunning=	false,
	machinePause=	true,
	laserPos	=	new Vec2(0, 0),
	goalPos		=	laserPos,
	minDistance	=	7,							//7mm
	intervalTime	=	argv.waitTime || 1000;	//1s = 1000ms
	argv.okWaitTime = argv.okWaitTime || 90;	//90s
	argv.maxFileSize = argv.maxFileSize || 1.5 * 1024 * 1024;


io.sockets.on('connection', function (socket) {
	var uploader = new siofu();
    uploader.dir = "./upload";
    uploader.listen(socket);
	uploader.on("start", function(event) {
		var file = event.file;
		var fileSize = file.size;
		if (fileSize > argv.maxFileSize) {
			socket.emit("error", {id: 3, message: "MAX FILE FILE is " + (settings.maxFileSize / 1024 / 1024) + "MB"});
			return false;
		}
	});
	 // Do something when a file is saved:
    uploader.on("complete", function(event){
        var file = event.file;
		var filepath = './' + file.pathName;
		var re = /(?:\.([^.]+))?$/;
		var ext = re.exec(filepath)[1];
		if (ext)
			ext = phpjs.strtolower(ext);
		setTimeout(function() {
			var content = fs.readFileSync(filepath).toString();
			SVGcontent = content;
			var isGCODEfile = (ext == 'gcode' || ext == 'sd' || ext == 'txt');
			var options = argv;
			socket.emit("percent");	
			if (!isGCODEfile)
				content = svg2gcode.svg2gcode(content, options);
			
			if (ext != 'svg')
				SVGcontent = "";
			addQueue(content);
			sendQueue();
			fs.unlink(filepath);
		}, file.size / 1024 / 2);
		
    });
	// Error handler:
    uploader.on("error", function(event){
        console.log("Error from uploader", event);
    });
	
	socket.on('start',function(){
  		start();
	});
	socket.on('requestQueue', function() {
		sendQueue(socket);
	});
	socket.on('pause', function() {
		pause();
	});
	socket.on('unpause', function() {
		unpause();
	});
	socket.on('softReset', function() {
		softReset();
	});
	socket.on('stop', function() {
		stop();
	});
	
	socket.emit("settings", argv);
});

server.listen(90);
siofu.listen(server);
console.log('Server runing port 90');

function sendQueue(socket) {
	socket = socket || io.sockets;
	console.log('sendQueue');
	socket.emit('AllGcode', gcodeDataQueue);
	if (SVGcontent != "") {
		sendSVG(SVGcontent);
	}
}

function sendSVG(content, socket) {
	socket = socket || io.sockets;
	console.log('sendSVG');
	socket.emit('sendSVG', phpjs.str_replace(["viewbox", "viewBox"], "removeViewBoxUh", content));
}

function finish() {
	console.log('finish');
	io.sockets.emit('finish');
	stop();
}

function stop() {
	machineRunning	= false;
	machinePause	= true;
	timer2			= 0;
	serialPort.write("M5\r");
	serialPort.write("g0x0y0z0\r");
	console.log('stop!');
}

function start() {	
	machineRunning	= true;
	machinePause	= false;
	console.log("machine is running!");
	timer2 = phpjs.time();
	if (gcodeQueue.length == 0 && gcodeDataQueue.length > 0)
		gcodeQueue = gcodeDataQueue.slice(0);
	serialPort.write("~\r");
}

function pause() {
	machinePause = true;
	serialPort.write("!\r");
	console.log("pause");
}

function unpause() {
	machinePause = false;
	serialPort.write("~\r");
	console.log("unpause");
}

function is_running() {
	return machineRunning && !machinePause;
}

function softReset() {
	console.log("reset");
	serialPort.write("\030");
}

function sendCommand(command) {
	if (is_running())
		console.log("this machine is running, so you can't execute any command");
	else {
		console.log("send command " + command);
		serialPort.write(command + "\r");
	}
}

function getPosFromCommand(which, command) {
	var tmp = phpjs.explode(which, command);
	if (tmp.length == 1)
		return undefined;
	return phpjs.floatval(tmp[1]);
}
function sendFirstGCodeLine() {
	if (gcodeQueue.length == 0) {
		finish();
		return false;
	}
	
	
	var command = gcodeQueue.shift();
	command = command.split(';');
	command = command[0];
	if (phpjs.strlen(command) <= 1 || command.indexOf(";") == 0)   //igrone comment line
		return sendFirstGCodeLine();
	command = phpjs.strtoupper(command);
	serialPort.write(command + "\r");
	
	io.sockets.emit("gcode", {command: command, length: gcodeQueue.length}, timer2);
	currentQueue++;	
	var commandX = getPosFromCommand('X', command);
	var commandY = getPosFromCommand('Y', command);
	if (commandX != undefined && commandY != undefined) {
		var newPos = new Vec2(phpjs.floatval(commandX), phpjs.floatval(commandY));
		currentDistance += newPos.distance(goalPos);
		goalPos = newPos;
	}
		
	return true;
}

function sendGcodeFromQueue() {
	if ((currentDistance < maxDistance || currentQueue < minQueue) && currentQueue <= maxQueue) {
		sendFirstGCodeLine();
	}
}

function receiveData(data) {
	if (data.indexOf('<') == 0) {	//type <status,...>
		data = phpjs.str_replace(['<', '>', 'WPos', 'MPos', ':', "\r", "\n"], '', data);
		var data_array = phpjs.explode(',', data);
		laserPos = new Vec2(phpjs.floatval(data_array[1]), phpjs.floatval(data_array[2]));
		io.sockets.emit('position', data_array, machineRunning, machinePause);
		
		if (laserPos.distance(goalPos) < minDistance) {
			currentQueue = 0;
			currentDistance = 0;
		}
	} else if (data.indexOf('ok') == 0) {
		timer1 = phpjs.time();
		if (is_running())
			sendGcodeFromQueue();
	} else if (data.indexOf('error') > -1) {
		io.sockets.emit('error', {id: 2, message: data});
	} else {
		io.sockets.emit('data', data);
	}
		
}

function addQueue(list) {
	if (phpjs.is_string(list)) {
		//200% make sure list is a string :D
		list = list.toString();
		var commas = ["\r\n", "\r", "\n"];
		for (var i = 0; i < commas.length; i++)
			if (list.indexOf(commas[i]) > 0) {
				list = phpjs.explode(commas[i], list);
				break;
			}				
	}
	
	//new queue
	gcodeQueue = list;
	gcodeDataQueue = list.slice(0);
}

serialPort.on("open", function (error) {
	if (error) {
		console.log(error);
		io.sockets.emit("error", {id: 0, message: "Can't open Serial port", error: error});
	} else {
		console.log('open serial port');
		var interval = setInterval(function() {
			serialPort.write("?\r", function (e) {
				if (e != undefined)
					io.sockets.emit('error');
			});
		}, intervalTime);
		serialPort.on('data', function(data) {
			 receiveData(data);
		});
	}
});

var AT_interval = setInterval(function() {
	serialPort.write("?\r");
	if (is_running() && phpjs.time() - timer1 > argv.okWaitTime) 
		io.sockets.emit("error", {id: 0, message: 'Long time to wait ok response'});
}, intervalTime);
