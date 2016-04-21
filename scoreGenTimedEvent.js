/*
	SCORE GENERATOR per nolageek's request (basic first version)
		- generates score files in text, html, and ansi from JSON scoreboard
		- set as a timed event to generate the files.  however current you want your scores to be. (see sbbs docs)
		- by default running the script should create the files in the stacktion directory
		- you can change this output directory for each file in the text, ansi, and html variable 
		- you can configure other options including coloring and the number of scores in those variables as well
		- to reiterate the above 2 points, the object variables text, ansi, and html are for you to set options

	** TODO (or if you want to help) **
		"beautifying the html output some more"
			- add classes to html table
			- fix formatting with css or somesuch

*/


load("json-client.js");
load("sbbsdefs.js");

var text = {
	outputDir:js.exec_dir,
	scoresToGrab:22
}

var ansi = {
	outputDir:js.exec_dir,
	scoresToGrab:22,
	username:'[1;31m',  // some ansi escape code for color to prefix string
	system:'[1;34m', // some ansi escape code for color to prefix string
	date:'[0;32m',// some ansi escape code for color to prefix string
	score:'[1;35m', // some ansi escape code for color to prefix string
	otherColor:'[0;36m',// some ansi escape code for color to prefix string
	normalize:'[1;30m'
}

var html = {
	outputDir:js.exec_dir,
	scoresToGrab:22,
	username:'blue',  // some html style tag, doesn't seem to work like this, but table gets made.  add css classes maybe if you want it in the html file building function if u grok it
	system:'red', // some html style tag
	date:'black',// some html style tag
	score:'green', // some html style tag
	otherColor:'magenta'// // some html style tag
}


var scoreHeader = "Stacktion High Scores";
var root = js.exec_dir;
var server_file = new File(file_cfgname(root, "stacktionServer.ini"));
server_file.open('r',true);
var serverAddr=server_file.iniGetValue(null,"host","localhost");
var serverPort=server_file.iniGetValue(null,"port",10088);
server_file.close();
var db = new JSONClient(serverAddr,serverPort);
var highScores = getHighScores();
writeTextFile();
writeAnsiFile();
writeHTMLFile();



function getHighScores(){
	hiScores= db.read("STACKTION","STACKTION.HISCORES",1);

	if(hiScores == undefined){
	    throw("High Scores Not Found");
	}
	hiScores.sort(function(a, b){
	 	return b.score-a.score;
	})
	return hiScores;
}

function writeTextFile(){
	var text_file = new File(file_cfgname(text.outputDir,'stacktionScores.txt'));
	text_file.open("w+");
	var scoreString =  Array(parseInt((80-scoreHeader.length)/2)).join(' ') + scoreHeader + Array(parseInt((80-scoreHeader.length)/2) - 2).join(' ') + '\r\n';
	for(var sc = 0; sc < text.scoresToGrab; sc ++){
		var score = highScores[sc];
		var offset1 = 25 - score.name.length - (sc + 1).toString().length;
		var offset2 = 25 - score.system.length;
		var offset3 = 10 - score.date.length;
		scoreString +=  (sc+1) + "." + score.name + Array(offset1).join(' ') + '    ' + score.system+ Array(offset2).join(' ') + score.date + Array(offset3).join(' ') + '    Rows : ' + score.score +'\r\n';
	}
	
	text_file.write(scoreString);
	text_file.close();
}

function writeAnsiFile(){
	var ansi_file = new File(file_cfgname(ansi.outputDir,'stacktionScores.ans'));
	ansi_file.open("w+");
	var scoreString = Array(parseInt((80-scoreHeader.length)/2)).join(' ') + ansi.otherColor + scoreHeader + ansi.normalize + Array(parseInt((80-scoreHeader.length)/2) - 2).join(' ') + '\r\n';
	for(var sc = 0; sc < ansi.scoresToGrab; sc ++){
		var score = highScores[sc];
		var offset1 = 25 - score.name.length - (sc + 1).toString().length;
		var offset2 = 25 - score.system.length;
		var offset3 = 10 - score.date.length;
		scoreString +=  ansi.otherColor + (sc+1) + "." + ansi.username + score.name + ansi.normalize + Array(offset1).join(' ') + '    ' + ansi.system + score.system +  ansi.normalize + Array(offset2).join(' ') + ansi.date + score.date + ansi.normalize +Array(offset3).join(' ') + ansi.otherColor + '    Rows : ' + ansi.score + score.score + ansi.normalize +'\r\n';
	}
	ansi_file.write(scoreString);
	ansi_file.close();
}

function writeHTMLFile(){
	var scoreString = "<!DOCTYPE html>\r\n<html><head><title>Stacktion High Scores</title></head><body>";
	var html_file = new File(file_cfgname(html.outputDir,'stacktionScores.html'));
	html_file.open("w+");
	scoreString += "<h2>" + scoreHeader + "</h2>";
	scoreString += "<table>"
	scoreString += "<tr><th>Rank</th><th>User</th><th>System</th><th>Date</th><th>Score</th></tr><tbody>"
	for(var sc = 0; sc < html.scoresToGrab; sc ++){
		var score = highScores[sc];
		var tRow = "<tr>";
		tRow += '<td style="' + html.otherColor +'">' + (sc+1) + '</td>' + '<td style="' + html.username +'">' + score.name + '</td>' + '<td style="' + html.system +'">' + score.system + '</td>' + '<td style="' + html.date +'">' + score.date + '</td> ' + '</td>' + '<td style="' + html.score +'">' + score.score + '</td> ' + '</tr>'
		scoreString += tRow;
	}
	scoreString += "</tbody></table></body></html>";
	html_file.write(scoreString);
	html_file.close();
}
