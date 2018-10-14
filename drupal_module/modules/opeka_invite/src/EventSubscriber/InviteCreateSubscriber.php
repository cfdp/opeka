<?php

namespace Drupal\opeka_invite\EventSubscriber;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Mail\MailManagerInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Utility\Token;
use Drupal\opeka_invite\Event\InviteEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Class InviteCreateSubscriber.
 */
class InviteCreateSubscriber implements EventSubscriberInterface {

  use StringTranslationTrait;

  /**
   * Mail manger service.
   *
   * @var \Drupal\Core\Mail\MailManagerInterface
   */
  protected $mail;

  /**
   * Token service.
   *
   * @var \Drupal\Core\Utility\Token
   */
  protected $token;

  /**
   * Current user.
   *
   * @var \Drupal\Core\Session\AccountProxyInterface
   */
  protected $user;

  /**
   * Current language.
   *
   * @var \Drupal\Core\Language\LanguageInterface
   */
  protected $currentLanguage;

  /**
   * OpekaInive configs.
   *
   * @var array
   */
  protected $configs;

  /**
   * Constructs a new InviteCreateSubscriber object.
   *
   * @param \Drupal\Core\Mail\MailManagerInterface $mail
   *   Mail manager service.
   * @param \Drupal\Core\Session\AccountProxyInterface $user
   *   Current user.
   * @param \Drupal\Core\Language\LanguageManagerInterface $language
   *   Language manager.
   * @param \Drupal\Core\Utility\Token $token
   *   Token service.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config
   *   Config factory.
   */
  public function __construct(MailManagerInterface $mail, AccountProxyInterface $user, LanguageManagerInterface $language, Token $token, ConfigFactoryInterface $config) {
    $this->configs = $config->get('opeka_invite.settings');
    $this->mail = $mail;
    $this->token = $token;
    $this->user = $user;
    $this->currentLanguage = $language->getCurrentLanguage();
  }

  /**
   * {@inheritdoc}
   */
  static function getSubscribedEvents() {
    return [
      InviteEvent::OPEKA_INVITE_CREATE => [
        ['mailToAdmin'],
        ['mailToUser'],
      ],
    ];
  }

  /**
   * Send the email to a user with invite information.
   *
   * @param \Drupal\opeka_invite\Event\InviteEvent $event
   *   Invite Event.
   */
  public function mailToUser(InviteEvent $event) {
    $invite = $event->getInvite();

    $this->mail->mail(
      'opeka_invite',
      'invite',
      $invite['invitee'] . '<' . $invite['email'] . '>',
      $this->currentLanguage->getId(),
      $this->getMailText($invite)
    );
  }

  /**
   * Send email copy to admin with invite information.
   *
   * @param \Drupal\opeka_invite\Event\InviteEvent $event
   *   Invite Event.
   */
  public function mailToAdmin(InviteEvent $event) {
    $invite = $event->getInvite();

    $mailText = $this->getMailText($invite);

    $this->mail->mail(
      'opeka_invite',
      'invite',
      $this->user->getAccountName() . '<' . $this->user->getEmail() . '>',
      $this->currentLanguage->getId(),
      [
        'subject' => $this->t('Copy of invitation: ') . $mailText['subject'],
        'body' => $this->t(
            'The following invitation has just been sent to @invitee: ',
            ['@invitee' => $invite['invitee']]
          ) . $mailText['body'],
      ]
    );
  }

  /**
   * Get subject and body of a mail.
   *
   * @param $invite
   *   Invite.
   *
   * @return array
   *   Array of subject and body.
   */
  protected function getMailText($invite) {
    $subject = $this->token->replace($this->configs->get('opeka_invite_subject'), ['invite' => $invite]);
    $body = $this->token->replace($this->configs->get('opeka_invite_body'), ['invite' => $invite]);

    return [
      'subject' => $subject,
      'body' => $body,
    ];
  }
}
