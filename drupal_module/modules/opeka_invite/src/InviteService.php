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
   **/
  public function createInvite() {
    // TODO: Implement createInvite() method.
  }

  /**
   * {@inheritdoc}
   **/
  public function cancelInvite() {
    // TODO: Implement cancelInvite() method.
  }

  /**
   * {@inheritdoc}
   **/
  public function getAllInvites() {
    // TODO: Implement getAllInvites() method.
  }

}
