<?php

namespace Drupal\opeka_invite\EventSubscriber;

use Drupal\opeka_invite\Event\InviteEvent;

/**
 * Class InviteCreateSubscriber.
 */
class InviteCreateSubscriber extends InviteEventsBaseSubscriber {

  /**
   * {@inheritdoc}
   */
  static function getSubscribedEvents() {
    return [
      InviteEvent::OPEKA_INVITE_CREATE => [
        ['mailToAdmin'],
        ['mailToUser'],
      ],
    ];
  }

  /**
   * Send the email to a user with invite information.
   *
   * @param \Drupal\opeka_invite\Event\InviteEvent $event
   *   Invite Event.
   */
  public function mailToUser(InviteEvent $event) {
    $invite = $event->getInvite();

    $prefix = $this->configs->get('opeka_invite_message');
    $invite['comment'] = $prefix && $invite['comment']
      ? $prefix . "\n\n" . $invite['comment']
      : $invite['comment'];

    $mail = $this->getMailText(self::CANCEL, $invite);

    $this->mail(
      'invite',
      $invite['invitee'] . '<' . $invite['email'] . '>',
      $mail['subject'],
      $mail['body']
    );
  }

  /**
   * Send email copy to admin with invite information.
   *
   * @param \Drupal\opeka_invite\Event\InviteEvent $event
   *   Invite Event.
   */
  public function mailToAdmin(InviteEvent $event) {
    $invite = $event->getInvite();

    $prefix = $this->configs->get('opeka_invite_message');
    $invite['comment'] = $prefix && $invite['comment']
      ? $prefix . "\n\n" . $invite['comment']
      : $invite['comment'];

    $mailText = $this->getMailText(self::CREATE, $invite);

    $this->mail(
      'invite',
      $this->user->getAccountName() . '<' . $this->user->getEmail() . '>',
      $this->t('Copy of invitation: ') . $mailText['subject'],
      $this->t(
        'The following invitation has just been sent to @invitee: ',
        ['@invitee' => $invite['invitee']]
      ) . $mailText['body']
    );
  }

}
