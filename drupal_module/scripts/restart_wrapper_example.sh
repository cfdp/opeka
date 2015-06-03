#!/bin/bash
# Wrapper script called by Drupal to restart the chat app, in this case via Monit.
# For this to work, you need to edit your sudoers file to allow www-data to run the
# Monit restart command.

# Log to console and backup.log
# cd /home/path/to/your/log
# exec >  >(tee -a /home/path/to/your/log/restart.log)
# exec 2> >(tee -a /home/path/to/your/log/restart.log >&2)

echo -e "Restarting the chat, this will take a few seconds... \n"
if [ "$1" == "http://yourdomain" ]
then
  sudo /usr/bin/monit restart yourchat
elif [ "$1" == "http://kram.curachat.com" ]
then
  sudo /usr/bin/monit restart yourotherchat
elif [ "$1" == "http://netstof.curachat.com" ]
else
  echo "Chat not identified - please contact support."
fi


