<?php

namespace Drupal\opeka_invite;

/**
 * Interface InviteServiceInterface.
 */
interface InviteServiceInterface {

  public function createInvite();

  public function cancelInvite();

  public function getAllInvites();
}
