<?php

namespace Drupal\opeka_invite;

use Drupal\Core\Database\Database;
use Drupal\Core\Database\Driver\mysql\Connection;

/**
 * Class InviteService.
 */
class InviteService implements InviteServiceInterface {

  /**
   * Database connection.
   *
   * @var \Drupal\Core\Database\Driver\mysql\Connection
   */
  protected $database;

  /**
   * Constructs a new InviteService object.
   *
   * @param \Drupal\Core\Database\Driver\mysql\Connection $database
   *   Database connection.
   */
  public function __construct(Connection $database) {
    $this->database = $database;
  }

  /**
   * {@inheritdoc}
   */
  public function createInvite(\stdClass $invite) {
    $inviteId = $this->database
      ->insert('opeka_invite', ['return' => Database::RETURN_INSERT_ID])
      ->fields(
        ['name', 'time', 'counselor', 'invitee', 'comment', 'email', 'token']
      )
      ->values((array) $invite)
      ->execute();

    return $this->loadInviteByID($inviteId);
  }

  /**
   * {@inheritdoc}
   **/
  public function cancelInvite($inviteId) {
    $inviteId = $this->database
      ->update('opeka_invite', ['return' => Database::RETURN_INSERT_ID])
      ->fields(['status' => 0])
      ->condition('iid', $inviteId)
      ->execute();

    return $this->loadInviteByID($inviteId);
  }

  /**
   * {@inheritdoc}
   **/
  public function getAllInvites() {
    return [];
  }

  /**
   * Load invite by ID.
   *
   * @param integer $inviteId
   *   Invite id.
   *
   * @return \stdClass
   *   Invite.
   */
  protected function loadInviteByID($inviteId) {
    $query = $this->database
      ->select('opeka_invite', 'oi')
      ->fields('oi');

    $query->condition('oi.iid', $inviteId);

    return $query
      ->execute()
      ->fetchObject();
  }

}
