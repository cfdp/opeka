<?php

namespace Drupal\opeka_invite\Controller;

use Drupal\Core\Controller\ControllerBase;

/**
 * Class ListInvitesController.
 */
class ListInvitesController extends ControllerBase {

  /**
   * Content.
   *
   * @return array
   *   Return renderer array.
   */
  public function content() {
    return [
      '#type' => 'markup',
      '#markup' => $this->t('Implement method: content'),
    ];
  }

}
