<?php

namespace Drupal\opeka_invite\Plugin\migrate\source;

use Drupal\migrate\Plugin\migrate\source\SqlBase;

/**
 * Invite source.
 *
 * @MigrateSource(
 *   id = "d7_invite_source"
 * )
 */
class InviteSource extends SqlBase {

  /**
   * {@inheritdoc}
   */
  public function fields() {
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
  public function query() {
    return $this
      ->select('opeka_invite', 'oi')
      ->fields(
        'oi',
        [
          'iid',
          'name',
          'time',
          'token',
          'invitee',
          'email',
          'counselor',
          'comment',
          'status',
          'count',
        ]
      );
  }
}
