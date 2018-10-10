<?php

namespace Drupal\opeka_invite\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\opeka_invite\InviteServiceInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Class ListInvitesController.
 */
class ListInvitesController extends ControllerBase {

  /**
   * Invite service.
   *
   * @var \Drupal\opeka_invite\InviteServiceInterface $inviteService.
   **/
  protected $inviteService;

  /**
   * ListInvitesController constructor.
   */
  public function __construct(InviteServiceInterface $inviteService) {

  }

  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('opeka_invite.invite')
    );
  }

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
