#!/usr/bin/env node
//require
var	express		=	require('express'),
	siofu 		= 	require("socketio-file-upload")
	app        	= 	express(),
	fs         	= 	require('fs'),
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

var	gcodeQueue	= 	[],
	currentQueue=	0,
	currentDistance=0,
	maxDistance	=	8,							//queue has enough elements to run enough 8mm
	minQueue	=	5,							// queue has at least 5 elements
	timer1		=	phpjs.time(),
	machineRunning=	false,
	machinePause=	true,
	laserPos	=	new Vec2(0, 0),
	goalPos		=	laserPos,
	minDistance	=	7,							//7mm
	okWaitTime	=	10,							//10s
	intervalTime	=	argv.waitTime || 1000;	//1s = 1000ms

/*


//main program

////read stdin data
var svg = ""; // svg's data
process.stdin.on('data', function(char) {
	svg += char;
});

////start process svg data
process.stdin.on('end', function() {
	console.log(svg2gcode.svg2gcode(svg, argv));
});

//// end process data
process.stdin.resume();


*/



app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});


io.sockets.on('connection', function (socket) {
	var uploader = new siofu();
    uploader.dir = "./upload";
    uploader.listen(socket);
	 // Do something when a file is saved:
    uploader.on("saved", function(event){
        var file = event.file;
		var filepath = file.pathName;
		var content = fs.readFileSync('./' + filepath).toString();
		content = svg2gcode.svg2gcode(content, argv);
		addQueue(content);
		start();
    });
	// Error handler:
    uploader.on("error", function(event){
        console.log("Error from uploader", event);
    });
	socket.on('message',function(data){
  		console.log();
	});
});

server.listen(90);
siofu.listen(server);
console.log('Server runing port 90');

function start() {
	io.sockets.emit('AllGcode', gcodeQueue);
	machineRunning	= true;
	machinePause	= false;
	console.log("machine is running!");
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
	if (gcodeQueue.length == 0)
		return false;
	var command = gcodeQueue.shift();
	serialPort.write(command + "\r");
	
	io.sockets.emit("gcode", {command: command, length: gcodeQueue.length});
	
	var commandX = getPosFromCommand('X', command);
	var commandY = getPosFromCommand('Y', command);
	if (commandX != undefined && commandY != undefined) {
		var newPos = new Vec2(phpjs.floatval(commandX), phpjs.floatval(commandY));
		currentDistance += newPos.distance(goalPos);
		goalPos = newPos;
	}
		
	if (gcodeQueue.length == 0)
		machineRunning = false;
	return true;
}

function sendGcodeFromQueue() {
	if (currentDistance < maxDistance || currentQueue < minQueue) {
		sendFirstGCodeLine();
		currentQueue++;	
	}
}

function receiveData(data) {
	if (data.indexOf('<') == 0) {	//type <status,...>
		data = phpjs.str_replace(['<', '>', 'WPos', 'MPos', ':', "\r", "\n"], '', data);
		var data_array = phpjs.explode(',', data);
		laserPos = new Vec2(phpjs.floatval(data_array[1]), phpjs.floatval(data_array[2]));
		io.sockets.emit('position', data_array);
		
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
	if (machineRunning && phpjs.time() - timer1 > okWaitTime) 
		io.socket.emit("error", {id: 0, message: 'Long time to wait ok response'});
}, intervalTime);
