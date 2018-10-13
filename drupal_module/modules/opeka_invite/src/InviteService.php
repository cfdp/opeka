<?php

namespace Drupal\opeka_invite;

use Drupal\Component\EventDispatcher\ContainerAwareEventDispatcher;
use Drupal\Core\Database\Database;
use Drupal\Core\Database\Driver\mysql\Connection;
use Drupal\opeka_invite\Event\InviteEvent;

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
   * Event dispatcher.
   *
   * @var \Drupal\Component\EventDispatcher\ContainerAwareEventDispatcher
   */
  protected $dispatcher;

  /**
   * Constructs a new InviteService object.
   *
   * @param \Drupal\Core\Database\Driver\mysql\Connection $database
   *   Database connection.
   * @param \Drupal\Component\EventDispatcher\ContainerAwareEventDispatcher $dispatcher
   *   Event dispatcher.
   */
  public function __construct(Connection $database, ContainerAwareEventDispatcher $dispatcher) {
    $this->database = $database;
    $this->dispatcher = $dispatcher;
  }

  /**
   * {@inheritdoc}
   */
  public function createInvite(array $invite) {
    $inviteId = $this->database
      ->insert('opeka_invite', ['return' => Database::RETURN_INSERT_ID])
      ->fields(
        ['name', 'time', 'counselor', 'invitee', 'comment', 'email', 'token']
      )
      ->values((array) $invite)
      ->execute();

    $invite = $this->loadInviteByID($inviteId);

    $this->dispatcher->dispatch(InviteEvent::OPEKA_INVITE_CREATE, new InviteEvent($invite));

    return $invite;
  }

  /**
   * {@inheritdoc}
   **/
  public function cancelInvite($inviteId) {
    $this->database
      ->update('opeka_invite', ['return' => Database::RETURN_AFFECTED])
      ->fields(['status' => 0])
      ->condition('iid', $inviteId)
      ->execute();

    $invite = $this->loadInviteByID($inviteId);

    $this->dispatcher->dispatch(InviteEvent::OPEKA_INVITE_CANCEL, new InviteEvent($invite));

    return $invite;
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
   * @return array
   *   Invite.
   */
  protected function loadInviteByID($inviteId) {
    $query = $this->database
      ->select('opeka_invite', 'oi')
      ->fields('oi');

    $query->condition('oi.iid', $inviteId);

    return $query
      ->execute()
      ->fetchAssoc();
  }

}
