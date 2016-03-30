/*
	stackion : clone of some stacking game from my phone
		stack tiles on top of the pile as they go back and forth.  hit spacebar to place.
		tile that overlaps the top of the stack will get placed on stack and size of next tile will change
		get 4 or more perfect stacks in a row and the tile will get bigger;
*/

load("frame.js");


var shaders = ['\1H\1K','\1N\1W','\1H\1W','\1H\1Y','\1N\1Y','\1N\1G','\1H\1G','\1H\1C','\1N\1C','\1H\1B','\1N\1B','\1N\1M','\1H\1M','\1H\1R','\1N\1R'];
//game control

var db = false; //debugging mode
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
	this.stackStr = initStackString + initStackString;
	this.over = false;
	this.swing = 1;
}

function main(){
		var game = new Game();
		initFrames(game);
		debugGraphics();
		while(go){
			var userInput = console.inkey(null,speed);
			game = gameCycle(game,userInput);
			if(game.over){
				bottomFeedback.clear();
				bottomFeedback.center('Press Q to Quit or Any key to play again');
				bottomFeedback.cycle();
				var response = console.getkey();
				if(response.toUpperCase() != "Q"){
						game = new Game();
						speed = 200;
						invalidateFrames();
						stackFrame.clear();
						cycleFrames(); 
						setFramesInit();
						initFrames(game);
						stackFrame.scroll(0,-1); 
						cycleFrames();
					} else {
						go = false;
					}

				}
		}

}

function gameCycle(game,inkey){
	switch (inkey){
		case ' ' :  //spaceBar places tile
			
			game = processMove(game);
			//debugGraphics();
			return game;
			//break; // hopefully by not breaking it will continue to default case and move nextTile;
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

function moveCurrentTile(game){
	if(game.currentTile.isNew){  
		// check to see if there are any extra rows on the screen and if the stackFrame needs to be raised, tile moved up a row, and buffer height -
		invalidateFrames();
		debug('\1h\1ybuffer frame height -> \1w ' + bufferFrame.height);
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
			debug('\1h\1c\r\n new tile added adjusting frame stuff\r\n');
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
	debug(err + 'composing stack string from ' + JSON.stringify(stackSubArr));
	stackString = "ERROR";
	}
	return stackString +'\r\n';
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
	topFeedback.putmsg('Welcome to the game!');
	bottomFeedback.center('Space Bar places Tile; "Q" to quit.');
	stackFrame.putmsg(game.stackStr);
	debug('debugging->');
	drawFrames();	
	cycleFrames();
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
function cycleFrames(){
	for(var fr = 0; fr < frames.length; fr++){
		frames[fr].cycle();
	}
}

function debug(message,frame){
	if(db == true){
		if(!frame){
			frame = bufferFrame;
		}
	frame.putmsg(message);
	frame.cycle();
	}
}
function debugGraphics(){
	debug('\1bbuffer frame height ' + bufferFrame.height + '\r\n');
	debug('\1gtileFrame width ' +tileFrame.width + '\r\n');
	debug('\1mstackFrame height ' +stackFrame.height + '\r\n');
}


main()
