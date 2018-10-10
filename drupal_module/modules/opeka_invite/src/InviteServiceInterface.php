<?php

namespace Drupal\opeka_invite;

/**
 * Interface InviteServiceInterface.
 */
interface InviteServiceInterface {

  /**
   * Crate Invite.
   *
   * @param \stdClass $invite
   *   Invite data.
   *
   * @return \stdClass
   *   Created Invite.
   *
   * @throws \Exception
   */
  public function createInvite(\stdClass $invite);

  /**
   * Cancel invite.
   *
   * @param integer $invite_id
   *   Invite id.
   *
   * @return \stdClass
   *   Canceled invite.
   */
  public function cancelInvite($invite_id);

  /**
   * Get Invites.
   *
   * @return array
   *   Array of invites.
   */
  public function getAllInvites();
}
