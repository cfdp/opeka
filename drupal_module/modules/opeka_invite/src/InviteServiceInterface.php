<?php

namespace Drupal\opeka_invite;

/**
 * Interface InviteServiceInterface.
 */
interface InviteServiceInterface {

  /**
   * Crate Invite.
   *
   * @param array $invite
   *   Invite data.
   *
   * @return array
   *   Created Invite.
   *
   * @throws \Exception
   */
  public function createInvite(array $invite);

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
