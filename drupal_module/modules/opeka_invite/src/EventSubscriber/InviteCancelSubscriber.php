<?php

namespace Drupal\opeka_invite\EventSubscriber;

use Drupal\opeka_invite\Event\InviteEvent;

/**
 * Class InviteCancelSubscriber.
 */
class InviteCancelSubscriber extends InviteEventsBaseSubscriber {

  /**
   * {@inheritdoc}
   */
  static function getSubscribedEvents() {
    return [
      InviteEvent::OPEKA_INVITE_CANCEL => [
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
    $mail = $this->getMailText(self::CANCEL, $invite);

    $this->mail(
      'invite',
      $this->user->getAccountName() . '<' . $this->user->getEmail() . '>',
      $this->t('Copy of cancellation: ') . $mail['subject'],
      $this->t(
        'The following cancellation has just been sent to @invitee: ',
        ['@invitee' => $invite['invitee']]
      ) . $mail['body']
    );
  }
}
