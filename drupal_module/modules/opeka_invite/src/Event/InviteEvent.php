<?php

namespace Drupal\opeka_invite\Event;

use Symfony\Component\EventDispatcher\Event;


class InviteEvent extends Event {
  /**
   * Called after create invite.
   */
  const OPEKA_INVITE_CREATE = 'opeka_invite.invite.create';

  /**
   * Called after cancel invite.
   */
  const OPEKA_INVITE_CANCEL = 'opeka_invite.invite.cancel';

  /**
   * Invite.
   *
   * @var \stdClass $invite
   */
  protected $invite;

  /**
   * InviteEvent constructor.
   *
   * @param array $invite
   *   Invite.
   */
  public function __construct(array $invite) {
    $this->invite = $invite;
  }

  /**
   * Returns invite.
   */
  public function getVariables() {
    return $this->invite;
  }

}
