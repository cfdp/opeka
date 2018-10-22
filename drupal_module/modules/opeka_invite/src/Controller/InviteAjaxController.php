<?php

namespace Drupal\opeka_invite\Controller;

use Drupal\Component\Utility\Crypt;
use Drupal\Component\Utility\SafeMarkup;
use Drupal\Core\Controller\ControllerBase;
use Drupal\opeka_invite\InviteService;
use Egulias\EmailValidator\EmailValidator;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;


/**
 * Class InviteAjaxController.
 */
class InviteAjaxController extends ControllerBase {

  /**
   *  Invite service.
   *
   * @var \Drupal\opeka_invite\InviteService
   */
  protected $inviteService;

  /**
   *  Email validator.
   *
   * @var \Egulias\EmailValidator\EmailValidator
   */
  protected $emailValidator;

  /**
   * InviteAjaxController constructor.
   *
   * @param \Drupal\opeka_invite\InviteService $inviteService
   *   Invite service.
   * @param \Egulias\EmailValidator\EmailValidator $emailValidator
   *   Email validator.
   */
  public function __construct(InviteService $inviteService, EmailValidator $emailValidator) {
    $this->inviteService = $inviteService;
    $this->emailValidator = $emailValidator;
  }

  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('opeka_invite.invite'),
      $container->get('email.validator')
    );
  }

  /**
   * Validate emails func.
   *
   * @param array $fields
   *   Array of fields what should be validated.
   * @param array $data
   *   Data.
   *
   * @return array
   *   Array of errors or empty array.
   */
  protected function validateEmailData($fields, $data) {
    $errors = [];

    foreach ($fields as $field => $key) {
      if (empty($data[$field])) {
        $errors[$key] = $this->t('You must enter an e-mail address.');
      }
      elseif (!$this->emailValidator->isValid($data[$field])) {
        $errors[$key] = $this->t('The e-mail address %mail is not valid.', [
          '%mail' => $data[$field],
        ]);
      }
    }

    return $errors;
  }

  /**
   * Validate Required Data func.
   *
   * @param array $fields
   *   Array of fields what should be validated.
   * @param array $data
   *   Data.
   *
   * @return array
   *   Array of errors or empty array.
   */
  protected function validateRequiredData($fields, $data) {
    $errors = [];

    foreach ($fields as $field => $key) {
      if (!isset($data[$field])) {
        $errors[$key] = $this->t('This field cannot be empty');
      }
    }

    return $errors;
  }

  /**
   * Create Invite.
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   *   Current request.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   Return JsonResponse.
   *
   * @throws \Exception
   */
  public function createInvite(Request $request) {
    $requiredFields = [
      'invitee' => 'invitee',
      'date' => 'datetime-date',
      'time' => 'datetime-time',
    ];
    $emailFields = ['email' => 'email'];

    $data = [
      'name' => trim(SafeMarkup::checkPlain($request->request->get('name'))),
      'date' => trim(SafeMarkup::checkPlain($request->request->get('date'))),
      'time' => trim(SafeMarkup::checkPlain($request->request->get('time'))),
      'email' => trim(SafeMarkup::checkPlain($request->request->get('email'))),
      'invitee' => trim(SafeMarkup::checkPlain($request->request->get('invitee'))),
      'counselor' => trim(SafeMarkup::checkPlain($request->request->get('counselor'))),
      'comment' => trim(SafeMarkup::checkPlain($request->request->get('comment'))),
    ];

    $errors = $this->validateRequiredData($requiredFields, $data) + $this->validateEmailData($emailFields, $data);

    if (!empty($errors)) {
      return new JsonResponse(['error' => $errors]);
    }

    $invite = $this->inviteService->createInvite([
      'name' => $data['name'] ?: t('Chat with !name', ['!name' => $data['invitee']]),
      'time' => strtotime($data['date'] . ' ' . $data['time']) ?: \Drupal::time()
        ->getRequestTime(),
      'counselor' => $data['counselor'] ?: $this->t('Counselor'),
      'invitee' => $data['invitee'],
      'comment' => $data['comment'],
      'email' => $data['email'],
      'token' => Crypt::randomBytesBase64(),
    ]);

    return new JsonResponse($invite);
  }

  /**
   * Cancel Invite.
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   *   Current request.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   Return JsonResponse.
   */
  public function cancelInvite(Request $request) {
    $inviteId = $request->request->get('invite_id');
    $responseData = [];

    if ($inviteId && is_numeric($inviteId)) {
      $responseData = $this->inviteService->cancelInvite($inviteId);
    }

    return new JsonResponse($responseData);
  }

}
