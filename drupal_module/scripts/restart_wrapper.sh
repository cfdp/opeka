#!/bin/bash
# Wrapper script called by Drupal to restart the chat app, in this case via Monit.
# For this to work, you need to edit your sudoers file to allow www-data to run the
# Monit restart command.
echo -e "Restarting the chat, this will take a few seconds... \n"
sudo /usr/bin/monit cfdpchat-app restart


