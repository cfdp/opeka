<?php

namespace Drupal\opeka_invite\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Datetime\DateFormatterInterface;
use Drupal\Core\Link;
use Drupal\opeka_invite\InviteServiceInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Class ListInvitesController.
 */
class ListInvitesController extends ControllerBase {

  /**
   * Invite service.
   *
   * @var \Drupal\opeka_invite\InviteServiceInterface $inviteService
   **/
  protected $inviteService;

  /**
   * Date formatter service..
   *
   * @var \Drupal\opeka_invite\InviteServiceInterface $inviteService
   **/
  protected $dateFormatter;

  /**
   * ListInvitesController constructor.
   *
   * @param \Drupal\opeka_invite\InviteServiceInterface $inviteService
   *   OpekaInvite service.
   * @param \Drupal\Core\Datetime\DateFormatterInterface $dateFormatter
   *   Date formatter service.
   */
  public function __construct(InviteServiceInterface $inviteService, DateFormatterInterface $dateFormatter) {
    $this->inviteService = $inviteService;
    $this->dateFormatter = $dateFormatter;
  }

  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('opeka_invite.invite'),
      $container->get('date.formatter')
    );
  }

  /**
   * Invites list Content.
   *
   * @return array
   *   Return renderer array.
   */
  public function content() {
    $invites = $this->inviteService->getAllInvites();

    return [
      'table' => [
        '#theme' => 'table',
        '#header' => [
          'id' => t('Invite ID'),
          'name' => t('Chat'),
          'date' => t('Date & time'),
          'status' => t('Status'),
          'counselor' => t('Counselor'),
          'invitee' => t('Invitee'),
          'email' => t('E-mail'),
          'comment' => t('Personal note'),
          'link' => t('Link'),
        ],
        '#rows' => $this->getInvitesRows($invites),
        '#empty' => t('No invitations have been created yet.'),
      ],
      [
        '#theme' => 'pager',
        '#element' => 0,
        '#parameters' => [],
        '#quantity' => 9,
        '#tags' => [],
        '#route_name' => '<none>',
      ],
    ];
  }

  /**
   * Get invite table rows.
   *
   * @param $invites
   *   Invites.
   *
   * @return array
   *   Array of invite table rows.
   */
  protected function getInvitesRows($invites) {
    $rows = [];

    foreach ($invites as $invite) {
      $rows[] = [
        'id' => $invite->iid,
        'name' => $invite->name,
        'date' => $this->dateFormatter->format($invite->time, 'custom', 'Y/m/j G:i'),
        'status' => $invite->status ? $this->t('Active') : $this->t('Cancelled'),
        'counselor' => $invite->counselor,
        'invitee' => $invite->invitee,
        'email' => $invite->email,
        'comment' => $invite->comment,
        'link' => Link::createFromRoute($this->t('Link'), 'opeka.chat_controller_mainChatPage', [], [
          'fragment' => 'invites/' . $invite->token,
          'absolute' => TRUE,
        ]),
      ];
    }

    return $rows;
  }

}
