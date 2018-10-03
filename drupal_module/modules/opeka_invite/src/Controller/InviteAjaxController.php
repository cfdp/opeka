<?php

namespace Drupal\opeka_invite\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\JsonResponse;


/**
 * Class InviteAjaxController.
 */
class InviteAjaxController extends ControllerBase {

  /**
   * Create Invite.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   Return AjaxResponse.
   */
  public function createInvite() {
    return new JsonResponse([
      'foo' => 'create'
    ]);
  }

  /**
   * Cancel Invite.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   Return AjaxResponse.
   */
  public function cancelInvite() {
    return new JsonResponse([
      'foo' => 'cancel'
    ]);
  }

}
