#!/bin/bash
# Wrapper script called by Drupal to restart the chat app, in this case via Monit.
# For this to work, you need to edit your sudoers file to allow www-data to run the
# Monit restart command.

# Log to console and backup.log
# cd /home/ubuntu/programs/cfdpchat/drupal_module/scripts
# exec >  >(tee -a /home/ubuntu/programs/cfdpchat/drupal_module/scripts/restart.log)
# exec 2> >(tee -a /home/ubuntu/programs/cfdpchat/drupal_module/scripts/restart.log >&2)

echo -e "Restarting the chat, this will take a few seconds... \n"
if [ "$1" == "http://ch.curachat.com" ]
then
  sudo /usr/bin/monit restart cyberhuschat
elif [ "$1" == "http://kram.curachat.com" ]
then
  sudo /usr/bin/monit restart kramchat
elif [ "$1" == "http://netstof.curachat.com" ]
then
  sudo /usr/bin/monit restart netstofchat
else
  echo "Chat not identified - please contact support."
fi


