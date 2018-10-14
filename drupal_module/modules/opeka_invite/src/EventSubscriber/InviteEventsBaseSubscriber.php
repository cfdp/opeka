<?php

namespace Drupal\opeka_invite\EventSubscriber;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Mail\MailManagerInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Utility\Token;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Abstract class InviteEventsBaseSubscriber.
 */
abstract class InviteEventsBaseSubscriber implements EventSubscriberInterface {

  use StringTranslationTrait;

  const CREATE = 'create';

  const CANCEL = 'cancel';

  /**
   * Mail manger service.
   *
   * @var \Drupal\Core\Mail\MailManagerInterface
   */
  protected $mailManager;

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
    $this->mailManager = $mail;
    $this->token = $token;
    $this->user = $user;
    $this->currentLanguage = $language->getCurrentLanguage();
  }


  /**
   * Get subject and body of a mail.
   *
   *
   * @param string $type
   *   Type of mail.
   * @param array $invite
   *   Invite.
   *
   * @return array
   *   Array of subject and body.
   */
  protected function getMailText($type, $invite) {
    $subject_config_field = 'opeka_invite_subject';
    $body_config_field = 'opeka_invite_body';

    if ($type === self::CANCEL) {
      $subject_config_field = 'opeka_invite_cancel_subject';
      $body_config_field = 'opeka_invite_cancel_body';
    }

    $subject = $this->token->replace($this->configs->get($subject_config_field), ['invite' => $invite]);
    $body = $this->token->replace($this->configs->get($body_config_field), ['invite' => $invite]);

    return [
      'subject' => $subject,
      'body' => $body,
    ];
  }

  /**
   * Sends an email message.
   *
   * @param string $key
   *   A key to identify the email sent. The final message ID for email altering
   *   will be {$module}_{$key}.
   * @param string $to
   *   The email address or addresses where the message will be sent to.
   * @param $subject
   *   Subject of email.
   * @param $body
   *   Body of email.
   *
   * @return array
   *   The $message array structure containing all details of the message.
   *
   * @see \Drupal\Core\Mail\MailManagerInterface::mail().
   */
  protected function mail($key, $to, $subject, $body) {
    return $this->mailManager->mail(
      'opeka_invite',
      $key,
      $to,
      $this->currentLanguage->getId(),
      [
        'subject' => $subject,
        'body' => $body,
      ]
    );
  }
}
