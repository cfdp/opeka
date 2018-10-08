<?php

namespace Drupal\opeka_invite;

use Drupal\Core\Database\Driver\mysql\Connection;

/**
 * Class InviteService.
 */
class InviteService implements InviteServiceInterface {

  /**
   * Drupal\Core\Database\Driver\mysql\Connection definition.
   *
   * @var \Drupal\Core\Database\Driver\mysql\Connection
   */
  protected $database;

  /**
   * Constructs a new InviteService object.
   *
   * @param \Drupal\Core\Database\Driver\mysql\Connection $database
   */
  public function __construct(Connection $database) {
    $this->database = $database;
  }

  /**
   * {@inheritdoc}
   */
  public function createInvite(\stdClass $invite) {
    return $this->database->insert('opeka_invite')
      ->fields(
        ['name', 'time', 'counselor', 'invitee', 'comment', 'email', 'token']
      )
      ->values((array) $invite)
      ->execute();
  }

  /**
   * {@inheritdoc}
   **/
  public function cancelInvite($invite_id) {
    return $this->database->update('opeka_invite')
      ->fields(['status' => 0])
      ->condition('iid', $invite_id)
      ->execute();
  }

  /**
   * {@inheritdoc}
   **/
  public function getAllInvites() {
    return [];
  }

}
