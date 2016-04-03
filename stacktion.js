/*
	stacktion : clone of some stacking game for phone
		stack tiles on top of the pile as they go back and forth.  hit spacebar to place.
		tile that overlaps the top of the stack will get placed on stack and size of next tile will change
		get 4 or more perfect stacks in a row and the tile will get bigger;
*/


//libs
load("sbbsdefs.js");
load("frame.js");
load("json-client.js");
// **** high score stuff ****
var root = js.exec_dir;
var server_file = new File(file_cfgname(root, "stacktionServer.ini"));
server_file.open('r',true);
var serverAddr=server_file.iniGetValue(null,"host","localhost");
var serverPort=server_file.iniGetValue(null,"port",10088);
server_file.close();
var myHighScore, highScores;
var db = new JSONClient(serverAddr,serverPort);


var shaders = ['\1N\1R','\1H\1R','\1H\1Y','\1N\1Y','\1N\1G','\1H\1G','\1H\1C','\1N\1C','\1H\1B','\1N\1B','\1N\1M','\1H\1M','\1H\1R','\1N\1R'];  //help!!! how to use background attributes with these escape sequences \14 for instance doesn't set bg to blue.
var bgAttr = [BG_BLACK,BG_BLUE,BG_MAGENTA,BG_RED,BG_CYAN,BG_LIGHTGRAY,BG_BROWN];
var bgShaders = ['\0016','\0015','\0010','\0011','\0014','\0017','\0013','\0012'];
var symbols = [ascii(176),ascii(177),ascii(178),ascii(219)];  

//game control

var dbug = false; //debugging mode
var startSpeed = 120;
var speed = startSpeed; //ms control input rate
var go = true;  // loop exit
var startTileSize = 50;

//frames
var masterFrame, topFeedback, bottomFeedback, stackFrame, bufferFrame,tileFrame;
masterFrame = new Frame(1,1,console.screen_columns,console.screen_rows);
setFramesInit();

//Game Object constructor
function Game(){
	this.shader = 0;
	this.symbol = 0;
	this.tileBg = 0;
	this.streak = 0;
	this.tileLength = startTileSize;
	this.currentTile = {
		position: [1,startTileSize + 1],
		display: "&",//{bg:BG_BLACK,fg:GREEN,char:"&"}
		isNew: true
	};
	this.row = 0;
	var stackOffsetL = (80 - startTileSize) / 2;
	var stackOffsetR;
	if(stackOffsetL % 2 != 0){
		stackOffsetL = Math.floor(stackOffsetL) + 1;
		stackOffsetR = 80 - stackOffsetL + 1;
	} else {
		stackOffsetR = 80 - stackOffsetL;
	}
	this.stack = [[stackOffsetL,stackOffsetR]];
	var initStackString = drawStackString(this.stack[this.stack.length - 1],ascii(219));
	this.stackStr = "\1w\1h" +initStackString + initStackString;
	this.over = false;
	this.swing = 1;
	this.startSwing = 1;
}

//main loop switch
function gameCycle(game,inkey){
	switch (inkey){
		case ' ' :  //spaceBar places tile		
			game = processMove(game);
		  	//debugGraphics();
			return game;
		case 'Q' :
			go = false;
			return game;
		case 'q' :
			go = false;
			return game;
		default: 
			//debug('moving tile ');
			game = moveCurrentTile(game);
			return game;
		}
}

function tileFillCharacterStr(game){
	var sym = game.symbol + 1;
	var tileBG = game.tileBg;
	var theShader = game.shader + 1;
	if(sym >= symbols.length)
		 sym = 0;
	if(tileBG >= bgShaders.length)
		tileBG = 0;
	if(theShader >= shaders.length)
		theShader= 0;
	return bgShaders[tileBG] + shaders[theShader] + Array(game.tileLength - 1).join(symbols[sym]);
}

function moveCurrentTile(game){ //changes the tile position and cycles frames if no input detected
	if(game.currentTile.isNew){  
		game.startSwing = game.swing;
		// check to see if there are any extra rows on the screen and if the stackFrame needs to be raised, tile moved up a row, and buffer height -
		tileFrame.clear();
		//debug('\1h\1ybuffer frame height -> \1w ' + bufferFrame.height);
		if(bufferFrame.height == 1){
			//tileFrame.attr = bgAttr[game.tileBg];
			tileFrame.width = game.tileLength;
			tileFrame.x = game.currentTile.position[0];
			game.currentTile.isNew = false;
		} else {
			stackFrame.y = stackFrame.y - 1;
			stackFrame.height = stackFrame.height + 1;
			tileFrame.width = game.tileLength;
			tileFrame.move(0,-1);
			bufferFrame.height = bufferFrame.height - 1;
			tileFrame.width = game.tileLength;
			tileFrame.x = game.currentTile.position[0];
			game.currentTile.isNew = false;
			stackFrame.scroll(0,-3);	
			//debug('\1h\1g\r\n creating new tile @ x = ' + tileFrame.x + ' @ width = ' + tileFrame.width);
		}	
		var tileFrameStr = tileFillCharacterStr(game);		

		tileFrame.center(tileFrameStr);	
	} else {  //move the tile if it's not new //fixme why are stacks getting out of range (negative nums / > 80)
		if(game.swing == 1 && tileFrame.x + tileFrame.width == 80){ // floating right and hits edge of screen, flip direction
			game.swing = -1;
		} 
		if(game.swing == -1 && tileFrame.x == 1){ // floating left, flip direction at edge
			game.swing = 1;
		}
		tileFrame.move(game.swing,0); // move the frame

		//adjust the game object;
		game.currentTile.position[0] += game.swing;
		game.currentTile.position[1] += game.swing;
	}
	masterFrame.cycle();
	return game;
} 

function processMove(game){
	var currentTile = game.currentTile  //start stop values i.e. [20,30] == 10 tile width starting at 20th positon on screen
	return game = addTileToStack(currentTile,game);  //append the tiles to the array of tiles and return whether or not the game continues as well as points; 	
}

function addTileToStack(thisTile,game){

	var lastTile = game.stack[game.stack.length - 1];
	var nextTile = {position:[-1,-1],display:'&',isNew:true};	//isNew flag to check to see whether the frames' height need to be readjusted if it's early in the game
	for(var i = thisTile.position[0];i <= lastTile[1];i++){ //	loop thru the positions in the placed tile and see where they match the top of stack(lastTile);
		if(nextTile.position[0] == -1 && i >= lastTile[0] && i <= lastTile[1]){   //set the low marker for the next Tile
			nextTile.position[0] = i; 
		}
		if(nextTile.position[0] >= 0 && lastTile[1] >= thisTile.position[1]){ //fits within bounds entirely of previous tile;
			nextTile.position[1] = thisTile.position[1];
			break;
		}
		if(nextTile.position[0] >= 0){  // left x is within bounds check to see if right x is last value;
			if(thisTile.position[1] == lastTile[1]){ // check to see if it's the last value;
				nextTile.position[1] = lastTile[1];
				break;
			} else {
					nextTile.position[1] = i;
			}
		}  
	}

	//go back if these loops are at end (for display stuff, colors, symbols)
	if(game.symbol >= symbols.length - 1){
		game.symbol = 0;
	} else {
		game.symbol++;
	}
	if(game.tileBg >= bgShaders.length - 1){
		game.tileBg = 0;
	} else {
		game.tileBg = 0;
	}
	nextTile.display = symbols[game.symbol];
	if(game.shader >= shaders.length - 1){
		game.shader = 0;
	} else {
		game.shader++;
	}

	//debug('\r\n\1rStart Swing ' + game.startSwing);
	//debug('shader ' + game.shader + ' val :'  + shaders[game.shader] + " Sample String");

	// *** MAKE UPDATES FOR NEXT MOVE/REFRESH + SCORE; UPDATE GAME OBJECT;
	game.swing = -(game.swing); // next tile will come the other direction;
	if(nextTile.position[0] == -1 || nextTile.position[1] < nextTile.position[0] || nextTile.position[1] - nextTile.position[0] < 1){
		game.over = true;
	} else {
		game.stack.push(nextTile.position);
		game.tileLength = nextTile.position[1] - nextTile.position[0] + 1;  //tileWidth
		if(game.swing == 1){  // swing to right  // check to adjust the starting position of the next tile;
			game.currentTile = {position:[1,game.tileLength + 1],display:'&'}
		} else { // swing to left
			game.currentTile = {position:[80-game.tileLength - 1,80],display:'&'}
		}
		game.currentTile.isNew = true;
		game.row++;
		//debug('last tile - > : ' + JSON.stringify(lastTile) + '\1h  this tile : ' + JSON.stringify(thisTile.position));
		//debug('\r\n\1c\1h incoming tile position \1n' + JSON.stringify(thisTile.position) + ' \1h compared to \1n ' + JSON.stringify(lastTile) + 'on the stack.  Results in an overlap of \1n' + JSON.stringify(nextTile.position));
		//debug('\r\nthe game has detected a next tilelength of ' + game.tileLength + ' . Checking for match'); 
		if(nextTile.position[1] - nextTile[0] >= lastTile[1] - lastTile[0] || (nextTile.position[0] == lastTile[0] && nextTile.position[1] == lastTile[1])){
			//debug('\1gTRUE!')
			game.streak++;
			for(var i = 0; i < game.streak && i < 3;i++){
				console.beep();
			}
			speed = speed - game.streak;
			if(game.streak >= 3 && game.tileLength < 75 ){  // tiles grow on streak;
				game.stack[game.stack.length-1[1]] = game.stack[game.stack.length-1[1]] + 1;
				game.stack[game.stack.length-1[0]] = game.stack[game.stack.length-1[0]] - 1;
				if(game.swing == 1){
					game.currentTile.position[1] = game.currentTile.position[1]  + 2;

				} else {
					game.currentTile.position[0] = game.currentTile.position[0] - 2;
				}
				//topFeedback.center('Tiles grow!');
				nextTile.position[0] = nextTile.position[0] - 1;
				nextTile.position[1] = nextTile.position[1] + 1;		
				game.tileLength = game.tileLength + 2;
			}
		} else {
			if(game.streak > 0)
				speed = speed + 10;
			//debug('\1rFALSE!');
			game.streak = 0;
		} // update the game object for moveCurrentTile;
	}
	topFeedback.clear();
	topFeedback.center("Rows : \1h\1y" + game.row + " \1w      Streak : \1y" + game.streak );
	stackFrame.clear();
	if(game.row + 2 > stackFrame.height){
		game.stackStr = trimStackString(game.stackStr,bottomFeedback,true);
	}
	game.stackStr = shaders[game.shader] + drawStackString(nextTile.position,nextTile.display,bgShaders[game.tileBg])  + game.stackStr;
	stackFrame.putmsg(game.stackStr);
	stackFrame.scroll(0,2);
	if(game.row + 3 >= stackFrame.height && bufferFrame.height === 1){
		stackFrame.scroll(0,(stackFrame.height - game.row - 6));
	}
	if(speed > 20 && game.streak < 3){
		if(speed >= 1.2 * startSpeed){
			speed = parseInt(speed - 10);
		} else {
		speed = parseInt(speed - 5);
	}
	} else {
		if(game.streak <= 0) // don't give time boost if on a run
			speed = parseInt(speed + (game.row/(game.tileLength * 2) * 10));
	}
	
	return game;
}

function drawStackString(stackSubArr,char,bgStr){  // takes an array representing a tile with two x coords and draws a line padded by blankspace;
	var stackString = "";
	try{
	if(stackSubArr[0] == -1){
		return Array(29).join(' ') + "\1h\1r !!! GAME OVER !!! " + Array(29).join(' '); + '\r\n';
	}
	 stackString = Array(stackSubArr[0]).join(' ') + (bgStr || '\0010') + Array(stackSubArr[1] - stackSubArr[0]).join(char) + '\0010' + Array(80 - stackSubArr[1]).join(' ') + '\0010\001K\1n.';
	} catch(err){
		stackString = Array(29).join(' ') + "\1h\1r !!! GAME OVER !!! " + Array(29).join(' '); + '\r\n';
	}
	return stackString +'\r\n';
}

function trimStackString(gameStackStr){
	var arr = gameStackStr.split('.');
	debug('trim stack rows from arr ' + arr.length);
	arr.pop();
	gameStackStr = arr.join('.');
	return gameStackStr;
}

function main(){
	try {
		bufferFrame.center('\1h\1yLoading high scores');
		masterFrame.cycle();
		getHighScores();
		bufferFrame.clear();
		myHighScore = getPlayerScores();
		var game = new Game();
		showHighScores();
		initFrames(game);
		bottomFeedback.center('Space to place tile -- "Q" will quit');
		topFeedback.center('YEAH BOYEEE!!!!  BOOMSHAKALAKA!!');
		masterFrame.cycle();
		while(go){
			var userInput = console.inkey(null,speed);
			game = gameCycle(game,userInput);
			if(game.over){  
				bottomFeedback.clear();
				bottomFeedback.center('GAME OVER!');
				updateScores(game);
				bottomFeedback.scroll(0,-1);
				masterFrame.cycle();
				console.getkey();
				game = new Game();
				showHighScores();
				masterFrame.close();
				setFramesInit();
				masterFrame.open();
				initFrames(game);
				bottomFeedback.clear();
				topFeedback.clear();
				topFeedback.center("YEE HAW YIPPEE KAY AY!");
				bottomFeedback.center('Space to place tile -- "Q" will quit');
				drawFrames();
				masterFrame.cycle(); 
				}
		}
	} catch(err){
		console.pause();
		console.write('\1rERROR line \1w ' + err.lineNumber + ' \1r' + err + '\n')
		console.write(JSON.stringify(game));
		console.pause();
	}
}


function showHighScores(){
	clearFrames();
	masterFrame.close();
	setFramesInit();	
	masterFrame.open();
	drawFrames();
	topFeedback.center('HIGH SCORES');
	bufferFrame.center("\1h\1y *** " + '\1h\1gGET IN ON THE STACKTION!!!' + "\1h\1y *** \r\n");
	bufferFrame.putmsg(constructHsString());
	stackFrame.clear();
	stackFrame.center("\1bYou've played \1h\1r" + myHighScore.stats.tries + '\1b times' + ' and your high score is \1h\1r' + myHighScore.stats.hi +'\1b rows');
	stackFrame.scroll(0,-2);
	bottomFeedback.clear();
	bottomFeedback.center('Press Q to Quit or Any key to play');
	masterFrame.cycle();
	var response = console.getkey();
	if(response.toUpperCase() != "Q"){
			clearFrames();
			speed = startSpeed;
			masterFrame.cycle();
		} else {
			go = false;
		}
};
function getHighScores(){
	highScores= db.read("STACKTION","STACKTION.HISCORES",1);
	db.cycle();

	if(highScores == undefined){
	    bufferFrame.center("Creating High Score File");
	    console.getkey;
	    var blankArray = [];
	    db.write("STACKTION","STACKTION.HISCORES",blankArray,2);
	    db.cycle();
	    highScores = db.read("STACKTION","STACKTION.HISCORES",1);
	    db.cycle();
	}
	highScores.sort(function(a, b){
	 	return b.score-a.score;
	})
}

function getPlayerScores(){
	var playerScores = db.read("STACKTION","STACKTION.SCORES",1);
	db.cycle();
	if(playerScores == undefined){
	    bufferFrame.center("Creating  Score File");
	    var blankArray = [];
	    db.write("STACKTION","STACKTION.SCORES",blankArray,2);
	    db.cycle();
	    playerScores = db.read("STACKTION","STACKTION.SCORES",1);
	    db.cycle();
	}
	function findMyHighScore(playerScoresArr){
		var myScoreObj = {};
		for(var hsi = 0; hsi < playerScoresArr.length; hsi++){
			var hsObj = playerScoresArr[hsi];
			if(hsObj.username == user.alias && hsObj.system == system.name){
				myScoreObj = hsObj;
				myScoreObj.index = hsi;
				//debug('found your high score ')
				break;
			}
		}
		if(typeof myScoreObj.index == 'undefined'){
			myScoreObj = {username:user.alias,system:system.name,index:highScores.length,stats:{hi:0,tries:0}};
			//debug('initializing my score object ' + JSON.stringify(myScoreObj));
			db.push("STACKTION","STACKTION.SCORES",myScoreObj,2);
			db.cycle();
			//debug('pushed myScore to DB')
			playerScores = db.read("STACKTION","STACKTION.SCORES",1);
			db.cycle();
		}
		return myScoreObj;
	}

	
		return findMyHighScore(playerScores);
	}

function updateScores(game){
	myHighScore.stats.tries++;
	if(game.row > myHighScore.stats.hi){
		myHighScore.stats.hi = game.row;
	}
	db.splice("STACKTION","STACKTION.SCORES",myHighScore.index,1,myHighScore,2);
	db.cycle();
	getHighScores();
	var date = new Date(time() * 1000);
	var dateStr = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
	var scoreObj = {name:user.alias,system:system.name,score:game.row,date:dateStr}
	if(highScores.length == 0){
		db.push("STACKTION","STACKTION.HISCORES",scoreObj,2);
		db.cycle();
	} else {
		var updated = false;
		for(var hs = 0; hs < highScores.length; hs++){
			if(highScores[hs].score < game.row){
				topFeedback.clear();
				topFeedback.center("You are number " + (hs + 1) + " on the high score list!");
				topFeedback.cycle();
				db.splice("STACKTION","STACKTION.HISCORES",hs,0,scoreObj,2);
				db.cycle();
				updated = true;
				break;
			}
		}
		if(updated == false){
			topFeedback.clear();
			topFeedback.center("You are number " + (highScores.length + 1) + " on the high score list!")
			db.push("STACKTION","STACKTION.HISCORES",scoreObj,2);
			db.cycle();
		}
	}
	getHighScores();
}
function debugGraphics(){ 
	debug('\1rstack frame height :\1h' + stackFrame.height + ' \1m y pos :\1h' + stackFrame.y + '\1gTile y pos -> \1h' + tileFrame.y);
	//debug('\1bbuffer frame height ' + bufferFrame.height + '\r\n');
	//debug('\1gtileFrame width ' +tileFrame.width + '\r\n');
	//debug('\1mstackFrame height ' +stackFrame.height + '\1h y-pos ---> ' + stackFrame.y + ' \r\n');
}

function setFramesInit(){
	topFeedback = new Frame(1,1,80,1,BG_BLUE|WHITE,masterFrame);  // provides feedback @ top of screen
	bottomFeedback = new Frame(1,console.screen_rows,80,1,BG_BLUE|WHITE,masterFrame);  //provides feedback
	stackFrame = new Frame(1,bottomFeedback.y - 2,80,2,BG_BLACK|WHITE,masterFrame);  //where the already stacked tiles go
	bufferFrame = new Frame(1,topFeedback.y + 1, 80,console.screen_rows - stackFrame.height - 3,BG_BLACK|WHITE,masterFrame);  //should be blank in game, use for debug information.  Goes from above tileFrame to below topFeedback
	tileFrame = new Frame(1,stackFrame.y - 1,startTileSize + 1,1,BG_BLACK|MAGENTA,masterFrame);  //the frame that should resize after every stacked tile and move, one above stack Frame;
}

function initFrames(game) {
	if(typeof stackFrame == 'undefined'){
		setFramesInit();
	} 
	clearFrames();
	stackFrame.putmsg(game.stackStr); 
	//masterFrame.cycle();
}

function constructHsString(){
	var str = "";
	for(var i = 0; i < bufferFrame.height - 2; i++){
		var score = highScores[i];
		if(typeof score == 'undefined'){
			break;
		}
		var offset1 = 25 - score.name.length - (i + 1).toString().length;
		var offset2 = 25 - score.system.length;
		var offset3 = 10 - score.date.length;
		str += "\1h\1m" + (i+1) + ". \1h\1b" + score.name + Array(offset1).join(' ') + '   \1n ' + score.system+ Array(offset2).join(' ') + score.date + Array(offset3).join(' ') + '   \1c Rows : \1h\1w' + score.score +'\r\n';
	}
	return str;
}


function drawFrames(){
	masterFrame.draw();
	topFeedback.draw();
	//tileFrame.draw();
	bottomFeedback.draw();
	stackFrame.draw();
	bufferFrame.draw();
}
function clearFrames(){
	topFeedback.clear();
	bottomFeedback.clear();
	tileFrame.clear();
	stackFrame.clear();
	bufferFrame.clear();
}

function debug(message,frame,pause){
	if(dbug == true){
		if(!frame){
			frame = bufferFrame;
		}
	frame.clear();
	frame.putmsg(message);
	frame.cycle();
	if(pause){
		console.getKey();
	}
	}
}



main()
