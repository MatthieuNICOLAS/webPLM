(function () {	
	'use strict';
	
	angular.module('PLMApp', ['ui.router', 'ui.codemirror'])

	.config(function($stateProvider, $urlRouterProvider) {
	    
	    $stateProvider
	        .state('home', {
	            url: '/',
	            templateUrl: 'assets/partials/home.html',
	            controller: 'HomeController',
	            controllerAs: 'home'
	        })
	        .state('exercise', {
	        	url: '/ui/lessons/:lessonID',
	        	templateUrl: 'assets/partials/exercise.html',
	        	controller: 'ExerciseController',
	        	controllerAs: 'exercise'
	        })
	        .state('exercise.current', {
	        	url: '/:exerciseID'
	        });
	    // catch all route
	    // send users to the home page 
	    $urlRouterProvider.otherwise('/');
	})
	.factory('connection', ['$rootScope', connection])
	.factory('listenersHandler', ['$rootScope', 'connection', listenersHandler])
	.factory('canvas', canvas)
	.controller('HomeController', ['$http', '$scope', '$sce', 'connection', 'listenersHandler', HomeController])
	.controller('ExerciseController', ['$http', '$scope', '$sce', '$stateParams', 'connection', 'listenersHandler', 'canvas', ExerciseController])
	.directive('lessonGallery', lessonGallery)
	.directive('lessonOverview', lessonOverview)
	.directive('worldsView', worldsView);
	
	
	function listenersHandler($rootScope, connection) {
		var registeredListeners = [];
		
		var service = {
				register: register,
				closeConnection: closeConnection,
		};
		return service;
		
		function register(action, fn) {
		    registeredListeners.push(action);
		    return $rootScope.$on(action, function (event, data) {
		        $rootScope.$apply(function () {
		            fn(data);
		        });
		    });
		};
		
		function sendMessage(msg) {
			connection.sendMessage(msg);
		};
		
		function destroyListeners() {
		    registeredListeners.forEach(function (value) {
		        $rootScope.$$listeners[value] = [];
		    });
		    registeredListeners = [];
		};
		
		function closeConnection() {
		   destroyListeners();
		   connection.endConnection();
		};
	};
	
	function connection ($rootScope) {		
		var socket = new WebSocket('ws://localhost:9000/websocket');
		var connectStatus = false;
		var pendingMessages = [];
		
		var service = {
			sendMessage: sendMessage,
			setupMessaging: setupMessaging,
			endConnection: endConnection
		};
		
		socket.onopen = function (event) {
			connectStatus = true;
			sendPendingMessages();
			$rootScope.$emit('onopen', event);
		};
		
		return service;
		
		function sendMessage(cmd, args) {
			var msg = {
	    			cmd: cmd,
	    			args: args || null
	    	};
	    	send(JSON.stringify(msg));
		};
		
		function send(msg) {
			if(!connectStatus) {
				pendingMessages.push(msg);
			}
			else {
				console.log('message sent: ', msg);
				socket.send(msg);
			}
		};
		
		function setupMessaging(fn) {
		    socket.onmessage = function (event) {
		    	var msg = JSON.parse(event.data);
			    
			    // Has to use $apply to warn AngularJS 
			    // that the model could have been updated
			    $rootScope.$apply(function () {
			    	fn(msg);
			    });
		    };
		};
		
		function sendPendingMessages() {
			pendingMessages.map(send);
		};
		
		function endConnection() {
			socket.close();
		};
	};
	
	function canvas () {
		var canvas;
		var ctx;
		var currentWorld;
		
		var bw;
		var bh;
		var p;
		
		var service = {
				init: init,
				setWorld: setWorld,
				update: update
		};
		
		return service;
		
		function init() {
			canvas = document.getElementById('worldView');
			ctx = canvas.getContext('2d');
			bw = 400;
			bh = 400;
			p = 0;
			console.log('On va dessiner!');
		}
		
		function setWorld (world) {
			currentWorld = world;
			update();
		};
		
		function update() {
			currentWorld.draw(ctx, bw, bh);
		};
	};
	
	function lessonGallery () {
		return {
			restrict: 'E',
			templateUrl: '/assets/templates-foundation/lesson-gallery-foundation.html'
		};
	};
	
	function lessonOverview () {
		return {
			restrict: 'E',
			templateUrl: '/assets/templates-foundation/lesson-overview-foundation.html'
		};
	};
	
	function worldsView() {
		return {
			restrict: 'E',
			templateUrl: '/assets/templates-foundation/worlds-view.html'
		}
	};
	
	
	function HomeController($http, $scope, $sce, connection, listenersHandler) {
	    var home = this;
			    
		home.lessons = [];
		home.currentLesson = null;
	    home.currentExercise = null;
		
	    home.getLessons = getLessons;
	    home.setLessons = setLessons;
	    home.setCurrentLesson = setCurrentLesson;
	    
	    var offHandleMessage = listenersHandler.register('onmessage', connection.setupMessaging(handleMessage));
	    
	    getLessons();
	    
	    function handleMessage(data) {
	    	console.log('message received: ', data);
	    	var cmd = data.cmd;
	    	var args = data.args;
	    	switch(cmd) {
	    		case 'lessons': 
	    			setLessons(args.lessons);
	    			break;
	    	}
	    };
	    
	    function getLessons() {
	    	connection.sendMessage('getLessons', null);
	    };
	    
	    function setLessons(lessons) {
	    	home.lessons = lessons.map(function (lesson) {
	    	  lesson.description = $sce.trustAsHtml(lesson.description);
	    	  return lesson;
	    	});
	    	console.log('updated home.lessons: ', home.lessons);
	    };
	    
	    function setCurrentLesson (lesson) {
	    	home.currentLesson = lesson;
	    };
	    
	    $scope.$on("$destroy",function() {
	    	offHandleMessage();
    	});
	};
	
	function ExerciseController($http, $scope, $sce, $stateParams, connection, listenersHandler, canvas) {
		var exercise = this;
		
		exercise.lessonID = $stateParams.lessonID;
		exercise.id = $stateParams.exerciseID;
		exercise.isRunning = false;
		exercise.description = null;
		exercise.resultType = null;
		exercise.resultMsg = null;
		exercise.initialWorlds = [];
		exercise.currentWorld = null;
		exercise.operations = [];
		
		exercise.runCode = runCode;
		
		function getExercise() {
			var args = {
					lessonID: exercise.lessonID,
			};
			if(exercise.id !== "")
			{
				args.exerciseID = exercise.id;
			}
	    	connection.sendMessage('getExercise', args);
	    };
		
		var offDisplayMessage = listenersHandler.register('onmessage', connection.setupMessaging(handleMessage));
		getExercise();

		function handleMessage(data) {
	    	console.log('message received: ', data);
	    	var cmd = data.cmd;
	    	var args = data.args;
	    	switch(cmd) {
	    		case 'exercise': 
	    			setExercise(args.exercise);
	    			break;
	    		case 'executionResult': 
	    			displayResult(args.msgType, args.msg);
	    			break;
	    		case 'operations':
	    			displayOperations(args.operations);
	    			break;
	    	}
	    };
	    
	    function setExercise(data) {
	    	exercise.id = data.id;
			exercise.description = $sce.trustAsHtml(data.description);
			exercise.code = data.code;
			exercise.initialWorlds = {};
			var currentWorldID = '';
			for(var worldID in data.initialWorlds) {
				currentWorldID = worldID;
				exercise.initialWorlds[worldID] = {};
				var initialWorld = data.initialWorlds[worldID];
				switch(initialWorld.type) {
					case 'BuggleWorld':
						exercise.initialWorlds[worldID] = new BuggleWorld(initialWorld.type, initialWorld.width, initialWorld.height, initialWorld.cells, initialWorld.entities)
						break;
				}
			}
			
			console.log('exercise: ', exercise);
			
			canvas.init();
			canvas.setWorld(exercise.initialWorlds[currentWorldID]);
			exercise.currentWorld = exercise.initialWorlds[currentWorldID];
	    };
	    
		function runCode() {
			var args = {
					lessonID: exercise.lessonID,
					exerciseID: exercise.id,
					code: exercise.code
			};
			connection.sendMessage('runExercise', args);
			exercise.isRunning = true;
		};
		
		function displayResult(msgType, msg) {
			console.log(msgType, ' - ', msg);
			exercise.isRunning = false;
		}
		
		function displayOperations(operations) {
			console.log('operations: ', operations);
			var step = [];
			for(var i=0; i<operations.length; i++) {
				var operation = operations[i];
				var result;
				switch(operation.type) {
					case 'moveBuggleOperation':
						result = new MoveBuggleOperation(operation.buggleID, operation.newX, operation.newY, operation.oldX, operation.oldY);
						break;
				}
				result.apply(exercise.currentWorld);
				step.push(result);
			}
			canvas.update();
		}
		
		$scope.$on("$destroy",function() {
	    	offDisplayMessage();
    	});
	};
	
	var MoveBuggleOperation = function (buggleID, newX, newY, oldX, oldY) {
		this.buggleID = buggleID;
		this.newX = newX;
		this.newY = newY;
		this.oldX = oldX;
		this.oldY = oldY;
	};
	
	MoveBuggleOperation.prototype.apply = function (currentWorld) {
		console.log('buggleID: ', this.buggleID);
		console.log('currentWorld: ', currentWorld);
		var buggle = currentWorld.buggles[this.buggleID];
		buggle.x = this.newX;
		buggle.y = this.newY;
		console.log(this.buggleID + ' has changed: ', buggle);
	};
	
	var BuggleWorldCell = function(x, y, hasBaggle, hasContent, hasLeftWall, hasTopWall) {
		this.x = x;
		this.y = y;
		this.hasBaggle = hasBaggle;
		this.hasContent = hasContent;
		this.hasLeftWall = hasLeftWall;
		this.hasTopWall = hasTopWall;
	};
	
	BuggleWorldCell.prototype.draw = function (ctx, canvasWidth, canvasHeight, width, height) {
		var xLeft = canvasWidth/width*this.x;
		var yTop = canvasHeight/height*this.y;
		
		var xRight = canvasWidth/width*(this.x+1);
		var yBottom = canvasHeight/height*(this.y+1);
		
		if((this.x+this.y)%2 === 0) {
			ctx.fillStyle = "rgb(230, 230, 230)";
		}
		else {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}
		
		ctx.fillRect(xLeft, yTop, xRight, yBottom);
		
		ctx.lineWidth = 30;
		ctx.strokeStyle = "blue";
		if(this.hasLeftWall) {
			ctx.moveTo(xLeft, yTop);
			ctx.lineTo(xLeft, yBottom);
		}
		if(this.hasTopWall) {
			ctx.moveTo(xLeft, yTop);
			ctx.lineTo(xRight, yTop);
		}
		ctx.stroke();
	};
	
	var Buggle = function (x, y, color, direction) {
		this.x = x;
		this.y = y;
		this.color = color;
		switch(direction) {
			case Direction.NORTH_VALUE:
				this.src = '/assets/images/buggle-top.svg';
				break;
			case Direction.EAST_VALUE:
				this.src = '/assets/images/buggle-right.svg';
				break;
			case Direction.SOUTH_VALUE:
				this.src = '/assets/images/buggle-bot.svg';
				break;
			case Direction.WEST_VALUE:
				this.src = '/assets/images/buggle-left.svg';
				break;
			default:
				this.src = '/assets/images/buggle-top.svg';
		}
	};
	
	Buggle.prototype.draw = function (ctx, canvasWidth, canvasHeight, width, height) {
		var buggle = this;
		var img = new Image();
		img.onload = function() {
			buggle.drawBuggleImage(ctx, img, canvasWidth, canvasHeight, width, height);
		};
		img.src = this.src;
	};
	
	Buggle.prototype.drawBuggleImage = function (ctx, img, canvasWidth, canvasHeight, width, height) {
		var imgWidth = canvasWidth/width*0.8;
		var imgHeight = canvasHeight/height*0.8;
		
		var xLeft = canvasWidth/width*this.x +imgWidth/width;
		var yTop = canvasHeight/height*this.y +imgHeight/height;
		
		ctx.drawImage(img, xLeft, yTop, imgWidth, imgHeight);
		var imgData = ctx.getImageData(xLeft, yTop, imgWidth, imgHeight);
		var data = imgData.data;
		for(var i=0; i<data.length; i += 4) {
			// Ignore image's "white" pixels
			if( !( (data[i] === 255 && data[i+1] === 255 && data[i+2] === 255) || (data[i] === 230 && data[i+1] === 230 && data[i+2] === 230) ) ) {
				data[i] = this.color[0];
				data[i+1] = this.color[1];
				data[i+2] = this.color[2];
				data[i+3] = this.color[3];
			}
		};
		ctx.putImageData(imgData, xLeft, yTop);
	};
	
	var BuggleWorld = function (type, width, height, cells, buggles) {
		this.type = type;
		this.width = width;
		this.height = height;
		
		this.cells = [];
		for(var i=0; i<width; i++) {
			this.cells[i] = [];
			for(var j=0; j<height; j++) {
				var cell = cells[i][j];
				this.cells[i][j] = new BuggleWorldCell(cell.x, cell.y, cell.hasBaggle, cell.hasContent, cell.hasLeftWall, cell.hasTopWall);
			}
		}
		
		this.buggles = {};
		for(var buggleID in buggles) {
			var buggle = buggles[buggleID]
			this.buggles[buggleID] = new Buggle(buggle.x, buggle.y, buggle.color, buggle.direction);
		}
		
	};
	
	BuggleWorld.prototype.draw = function (ctx, canvasWidth, canvasHeight) {
		for(var i=0; i<this.width; i++) {
			for(var j=0; j<this.height; j++) {
				this.cells[i][j].draw(ctx, canvasWidth, canvasHeight, this.width, this.height);
			}
		}
		
		for(var buggleID in this.buggles) {
			this.buggles[buggleID].draw(ctx, canvasWidth, canvasHeight, this.width, this.height);
		}
		
	};
	
	var Direction = {
		NORTH_VALUE: 0,
		EAST_VALUE: 1,
		SOUTH_VALUE: 2,
		WEST_VALUE: 3
	};
})();