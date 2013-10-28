#!/bin/bash
# Script to stop the forever process running the cfdpchat-app
# authors: Daniel Mois and Benjamin Christensen
# The paths below should be updated to match your server setup.
# The file should then be saved as a new file called stopchat

APPLICATION_DIRECTORY="/home/benjamin/workspace/web/cfdpchat/nodejs"
APPLICATION_START="main.js"
LOG="/home/benjamin/workspace/web/cfdpchat/logs/forever.log"

echo -e "Stopping CfDP Chat... \n"

# cd to app home directory
cd $APPLICATION_DIRECTORY

forever stop $APPLICATION_START
