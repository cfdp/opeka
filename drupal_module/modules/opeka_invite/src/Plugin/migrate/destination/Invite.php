<?php

namespace Drupal\opeka_invite\Plugin\migrate\destination;

use Drupal\migrate\Annotation\MigrateDestination;
use Drupal\migrate\Plugin\migrate\destination\DestinationBase;
use Drupal\migrate\Plugin\MigrationInterface;
use Drupal\migrate\Row;

/**
 * Invites destination.
 *
 * @MigrateDestination(
 *   id = "d7_invites_destination"
 * )
 */
class Invite extends DestinationBase {

  /**
   * {@inheritdoc}
   */
  public function getIds() {
    return [
      'iid' => [
        'type' => 'integer',
        'alias' => 'oi',
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function fields(MigrationInterface $migration = NULL) {
    return [
      'iid' => $this->t('Unique invitation ID.'),
      'name' => $this->t('Invitation name.'),
      'time' => $this->t('Unix timestamp for the invitation scheduled time.'),
      'token' => $this->t('Random token used for user authentication.'),
      'invitee' => $this->t('Invitee name.'),
      'email' => $this->t('Invitee email.'),
      'counselor' => $this->t('Counselor name.'),
      'comment' => $this->t('Personal message.'),
      'status' => $this->t('1 if the invitation is active, 0 otherwise'),
      'count' => $this->t('How many times the token has been checked against.'),
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function import(Row $row, array $old_destination_id_values = []) {
    $a123 = 1;
    $a123++;
    $a123++;
  }
}
