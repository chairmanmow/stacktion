# stacktion
Stacktion
------
A game for Synchronet BBS 3.16+
by larrylagomorph -at- grudgedu.synchro.net, April 2016
Most recent version hosted @ : https://github.com/chairmanmow/stacktion


Contents
--------

1) About
2) Requirements
3) Installation
	3.1) Connect to the networked scoreboard
	3.2) Host your own scoreboard
4) Support


1) About
--------

Gameplay Video : https://youtu.be/QC8RB72aG4U


2) Requirements
---------------

This game may run on Synchronet 3.15, but has not been tested with anything
less than 3.16.

Ensure that you have the latest copies of the following files in your exec/load/
directory.  You can grab them one by one, or do a CVS update.  (If you choose
to update everything, backing up your BBS is a good idea.)

- frame.js:
	http://cvs.synchro.net/cgi-bin/viewcvs.cgi/*checkout*/exec/load/frame.js
- json-client.js:
	http://cvs.synchro.net/cgi-bin/viewcvs.cgi/*checkout*/exec/load/json-client.js


3) Installation
---------------
Download the contents of this project ("stacktion.js" & "stacktionServer.ini") to a directory ../xtrn/stacktion


In 'scfg' (that's BBS->Configure from the Synchronet Control Panel in Windows),
go to "External Programs -> Online Programs (Doors)" and select the area you
wish to add this game to.  Create a new entry, and set it up as follows:

Name: Stacktion
Internal Code: Stacktion
Start-up Directory: ../xtrn/stacktion/
Command Line: ?stacktion.js
Multiple Concurrent Users: Yes

(All other options can be left at their default values.)

	3.1) Connect to the networked scoreboard
	----------------------------------------

		The game is already configured to connect to a local game to the networked scoreboard that
		I host.  To do so, use the included file or called 'stacktionServer.ini' in the Stacktion game
		directory, which should have the following two lines:

		host = grudgedu.synchro.net
		port = 10088


	3.2) Host your own scoreboard
	-----------------------------

	If you prefer not to connect to my scoreboard, you will need to set up your
	own or the game will not work.  To do so, ensure that the JSON service is
	enabled via the following entry in your 'ctrl/services.ini'	file:

		[JSON]
		Port=10088
		Options=STATIC | LOOP
		Command=json-service.js

	If you've just added the above to your services.ini file, you may need to
	restart your services (just restart your BBS if you don't know how) in
	order for the change to take effect.

	You will also need to add the following to your 'ctrl/json-service.ini'
	file (create one if it doesn't already exist):

	[STACKTION]
	dir=../xtrn/lemons/

	Edit the 'stackionServer.ini' file , To configure Stacktion 
	to connect to a JSON-DB server at 127.0.0.1 on port 10088. If your JSON
	server binds to another port or address, create a 'server.ini' file with
	the appropriate values.

	You can allow other systems to connect to your scoreboard by opening your
	JSON-DB server's port to them.  They will need to create or modify their
	'stacktionServer.ini' files accordingly.


4) Support
----------

If there is an issue with the game, please post an issue in the github repository.  
	https://github.com/chairmanmow/stacktion

Otherwise for generalized support, try finding larry_lagomorph on irc.synchro.net or send an email to larrylagomorph -at- grudgedu.synchro.net
