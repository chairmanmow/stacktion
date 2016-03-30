/*
	stacker : clone of ios game stack;
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
var highScores,myHighScore;
var db = new JSONClient(serverAddr,serverPort);


var shaders = ['\1H\1K','\1N\1W','\1H\1W','\1H\1Y','\1N\1Y','\1N\1G','\1H\1G','\1H\1C','\1N\1C','\1H\1B','\1N\1B','\1N\1M','\1H\1M','\1H\1R','\1N\1R'];
//game control

var dbug = false; //debugging mode
var speed = 200; //ms control input rate
var go = true;  // loop exit
var startTileSize = 70;

//frames
var masterFrame, topFeedback, bottomFeedback, stackFrame, bufferFrame,tileFrame;
masterFrame = new Frame(1,1,console.screen_columns,console.screen_rows);
setFramesInit();
var frames = [masterFrame,topFeedback,bottomFeedback,stackFrame,bufferFrame,tileFrame];

//Game Object constructor
function Game(){
	this.shader = 0;
	this.streak = 0;
	this.tileLength = startTileSize;
	this.currentTile = {
		position: [1,startTileSize +1],
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
	var initStackString = drawStackString(this.stack[this.stack.length - 1],'&');
	this.stackStr = initStackString + initStackString + initStackString;
	this.over = false;
	this.swing = 1;
}

//main loop switch
function gameCycle(game,inkey){
	switch (inkey){
		case ' ' :  //spaceBar places tile		
			game = processMove(game);
		  	debugGraphics();
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

function moveCurrentTile(game){ //changes the tile position and cycles frames if no input detected
	if(game.currentTile.isNew){  
		// check to see if there are any extra rows on the screen and if the stackFrame needs to be raised, tile moved up a row, and buffer height -
		invalidateFrames();
		//debug('\1h\1ybuffer frame height -> \1w ' + bufferFrame.height);
		if(bufferFrame.height == 1){
			tileFrame.width = game.tileLength;
			tileFrame.x = game.currentTile.position[0];
			game.currentTile.isNew = false;
		} else {
			stackFrame.y = stackFrame.y - 1;
			stackFrame.height = stackFrame.height + 1;
			tileFrame.width = game.tileLength;
			tileFrame.move(0,-1);
			bufferFrame.height = bufferFrame.height - 1;
			//change the frame size of the tile frame.
			tileFrame.width = game.tileLength;
			tileFrame.x = game.currentTile.position[0];
			game.currentTile .isNew = false;
			stackFrame.scroll(0,-3);
			openFrames();
			drawFrames();		
			//debug('\1h\1c\r\n new tile added adjusting frame stuff\r\n');
		}		
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
	cycleFrames();
	return game;
} 

function processMove(game){
	var currentTile = game.currentTile  //start stop values i.e. [20,30] == 10 tile width starting at 20th positon on screen
	return game = addTileToStack(currentTile,game);  //append the tiles to the array of tiles and return whether or not the game continues as well as points; 	
}

function addTileToStack(thisTile,game){

	var lastTile = game.stack[game.stack.length - 1];
	var nextTile = {position:[-1,-1],display:'&',isNew:true};	//isNew flag to check to see whether the frames' height need to be readjusted if it's early in the game
	for(var i = thisTile.position[0];i < lastTile[1];i++){ //	loop thru the positions in the placed tile and see where they match the top of stack(lastTile);
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
	if(game.shader >= shaders.length - 1){
		game.shader = 0;
	} else {
		game.shader++;
	}
	game.stackStr = shaders[game.shader] + drawStackString(nextTile.position,nextTile.display) + game.stackStr;
	stackFrame.clear();
	stackFrame.cycle();
	stackFrame.putmsg(game.stackStr);
	
	//debug('shader ' + game.shader + ' val :'  + shaders[game.shader] + " Sample String");
	// *** MAKE UPDATES FOR NEXT MOVE/REFRESH + SCORE; UPDATE GAME OBJECT;
	game.swing = -(game.swing); // next tile will come the other direction;
	if(nextTile.position[0] == -1 || nextTile.position[1] < nextTile.position[0]){
		game.over = true;
	} else {
		game.stack.push(nextTile.position);
		game.tileLength = nextTile.position[1] - nextTile.position[0] + 1;
		if(game.swing == 1){  // swing to right  // check to adjust the starting position of the next tile;
			game.currentTile = {position:[1,game.tileLength],display:'&'}
		} else { // swing to left
			game.currentTile = {position:[80-game.tileLength,80],display:'&'}
		}
		game.currentTile.isNew = true;
		game.row++;
		//debug('last tile - > : ' + JSON.stringify(lastTile) + '\1h  this tile : ' + JSON.stringify(thisTile.position));
		if(thisTile.position[0] == lastTile[0] && thisTile.position[1] == lastTile[1 ]){
			game.streak++;
			for(var i = 0; i < game.streak && i < 3;i++){
			console.beep();
		}
			if(game.streak >= 3){  // tiles grow on streak;
				topFeedback.center('Tiles grow!');
				game.tileLength++;
			}
		} else {
			game.streak = 0;
		} // update the game object for moveCurrentTile;
	}
	topFeedback.center("Rows : " + game.row + "    Streak : " + game.streak + "  Speed : " + speed);
	speed = parseInt(speed * .97);
	return game;
}

function drawStackString(stackSubArr,char){  // takes an array representing a tile with two x coords and draws a line padded by blankspace;
	try{
	var stackString = Array(stackSubArr[0]).join(' ') + Array(stackSubArr[1] - stackSubArr[0]).join(char) + Array(80 - stackSubArr[1] + 1).join(' ');
	//debug(stackString.length + ' stackStr len from arr -> ' + JSON.stringify(stackSubArr));
	} catch(err){
	//debug(err + 'composing stack string from ' + JSON.stringify(stackSubArr));
	//stackString = "ERROR";
	}
	return stackString +'\r\n';
}

function main(){
	try {
		getHighScores();
		debug('high scores ' + JSON.stringify(highScores));
		myHighScore = getPlayerScores();
		debug('my high score ' + JSON.stringify(myHighScore));
		var game = new Game();
		initFrames(game);
		showHighScores();
		topFeedback.center("Rows : " + game.row + "    Streak : " + game.streak + "  Speed : " + speed);
		bottomFeedback.center('Space to place tile -- "Q" will quit');
		stackFrame.putmsg(game.stackStr);
		debugGraphics();
		while(go){
			var userInput = console.inkey(null,speed);
			game = gameCycle(game,userInput);
			if(game.over){  // fixme : new-game first line doesn't align right with tile frame even though values seem right
				updateScores(game);
				bottomFeedback.clear();
				bottomFeedback.center('GAME OVER!');
				//debug(JSON.stringify(game));
				bottomFeedback.cycle();
				console.getkey();
				game = new Game();
				showHighScores();
				stackFrame.clear();
				stackFrame.invalidate();			
				initFrames(game);
				debugGraphics();
				bottomFeedback.clear();
				topFeedback.center("Rows : " + game.row + "    Streak : " + game.streak + "  Speed : " + speed);
				bottomFeedback.center('Space to place tile -- "Q" will quit');
				stackFrame.clear();
				stackFrame.putmsg(game.stackStr);
				cycleFrames(); 
				}
		}
	}

	catch(err){
		console.pause();

		console.write('\1rERROR line \1w ' + err.lineNumber + ' \1r' + err + '\n')
		console.write(JSON.stringify(game));
		console.pause();
	}
}

function showHighScores(){
	clearFrames();
	invalidateFrames();
	setFramesInit();	
	openFrames();
	drawFrames();
	topFeedback.center('HIGH SCORES');
	bufferFrame.center("\1h\1y *** " + '\1h\1gGET IN ON THE STACKTION!!!' + "\1h\1y *** \r\n");
	bufferFrame.putmsg(constructHsString());
	stackFrame.clear();
	stackFrame.center("\1bYou've played \1h\1r" + myHighScore.stats.tries + '\1b times' + ' and your high score is \1h\1r' + myHighScore.stats.hi +'\1b rows');
	stackFrame.scroll(0,-2);
	bottomFeedback.clear();
	bottomFeedback.center('Press Q to Quit or Any key to play');
	cycleFrames();
	var response = console.getkey();
	if(response.toUpperCase() != "Q"){
			clearFrames();
			invalidateFrames();
			speed = 200;
			stackFrame.clear();
			bottomFeedback.clear();
			bufferFrame.clear();
			topFeedback.clear();
			cycleFrames();
		} else {
			go = false;
		}
};
function getHighScores(){
	highScores = db.read("STACKTION","STACKTION.HISCORES",1);
	db.cycle();

	if(highScores == undefined){
	    bufferFrame.center("Creating High Score File");
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
	var scoreObj = {name:user.alias,system:system.name,score:game.row}
	if(highScores.length == 0){
		db.push("STACKTION","STACKTION.HISCORES",scoreObj,2);
		db.cycle();
	} else {
		var updated = false;
		for(var hs = 0; hs < highScores.length; hs++){
			if(highScores[hs].score < game.row){
				topFeedback.clear();
				topFeedback.center("You are number " + (hs + 1) + " on the high score list!")
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
	tileFrame = new Frame(1,stackFrame.y - 1,startTileSize,1,BG_GREEN|MAGENTA,masterFrame);  //the frame that should resize after every stacked tile and move, one above stack Frame;
}

function initFrames(game) {
	if(typeof stackFrame == 'undefined'){
		setFramesInit();
	} 
	openFrames();
	//debug('debugging->');
	drawFrames();	
	cycleFrames();
}

function constructHsString(){
	var str = "";
	for(var i = 0; i < bufferFrame.height - 2; i++){
		var score = highScores[i];
		if(typeof score == 'undefined'){
			break;
		}
		var offset1 = 30 - score.name.length - (i + 1).toString().length;
		var offset2 = 30 - score.system.length;
		str += "\1h\1m" + (i+1) + ". \1h\1b" + score.name + Array(offset1).join(' ') + '   \1n ' + score.system+ Array(offset2).join(' ') + '   \1c Rows : \1h\1w' + score.score +'\r\n';
	}
	return str;
}

function deleteFrames(){
	for(var f = 0; f < frames.length; f++){
		frames[f].delete();
	}
}
function openFrames(){
	for(var f = 0; f < frames.length; f++){
		var aFrame = frames[f];
		aFrame.open();
	} 
}

function drawFrames(){
	for(var fr = 0; fr < frames.length; fr++){
		frames[fr].draw();
	}
}

function invalidateFrames(){
	for(var fr = 1; fr < frames.length; fr++){
		frames[fr].invalidate();
	}
}

function clearFrames(){
	for(var fr = 1; fr < frames.length; fr++){
		frames[fr].clear();
	}
	masterFrame.cycle();
}





function debug(message,frame){
	if(dbug == true){
		if(!frame){
			frame = bufferFrame;
		}
	frame.putmsg(message);
	frame.cycle();
	}
}

function cycleFrames(){
	masterFrame.cycle();
}

main()
