<?php

/**
 * @file
 * File for custom token hooks.
 */

use Drupal\Core\Render\BubbleableMetadata;

/**
 * Implements hook_token_info().
 */
function opeka_invite_token_info() {
  $invites = [
    'name' => t('Opeka invite tokens'),
    'description' => t('Opeka invite token processors.'),
    'needs-data' => 'invite',
  ];

  $invites_tokens['name'] = [
    'name' => t('Name'),
    'description' => t('Invitee name.'),
  ];

  $invites_tokens['mail'] = [
    'name' => t('Email'),
    'description' => t('Invitee email.'),
  ];

  $invites_tokens['chat'] = [
    'name' => t('Chat'),
    'description' => t('Invite name.'),
  ];

  $invites_tokens['date'] = [
    'name' => t('Date'),
    'description' => t('Date of creating invite.'),
  ];

  $invites_tokens['link'] = [
    'name' => t('Link'),
    'description' => t('Invite link.'),
  ];

  $invites_tokens['counselor'] = [
    'name' => t('Counselor'),
    'description' => t('Counselor name.'),
  ];

  $invites_tokens['message'] = [
    'name' => t('Message'),
    'description' => t('Personal message.'),
  ];

  return [
    'types' => [
      'opeka_invite' => $invites,
    ],
    'tokens' => [
      'invites' => $invites_tokens,
    ],
  ];
}

/**
 * Implements hook_tokens().
 */
function opeka_invite_tokens($type, $tokens, array $data, array $options, BubbleableMetadata $bubbleable_metadata) {
  $replacements = [];
  /* @var \Drupal\Core\Routing\UrlGeneratorInterface $urlGenerator */
  $urlGenerator = \Drupal::service('url_generator');
  /* @var \Drupal\Core\Datetime\DateFormatterInterface $dateFormatter */
  $dateFormatter = \Drupal::service('date.formatter');
  /* @var \Drupal\Core\Config\ImmutableConfig $opeka_config */
  $opeka_config = \Drupal::config('opeka_invite.settings');

  if ($type == 'opeka_invite' && !empty($data['invite'])) {
    $invite = $data['invite'];

    foreach ($tokens as $name => $original) {
      switch ($name) {
        case 'name':
          $replacements[$original] = $invite['invitee'];
          break;
        case 'mail':
          $replacements[$original] = $invite['email'];
          break;
        case 'chat':
          $replacements[$original] = $invite['name'];
          break;
        case 'date':
          $replacements[$original] = $dateFormatter->format($invite['time'], 'custom', 'l j F Y, G:i');
          break;
        case 'link':
          $replacements[$original] = $urlGenerator
            ->generateFromRoute('opeka.chat_controller_mainChatPage', [], [
              'fragment' => 'invites/' . $invite['token'],
              'absolute' => TRUE,
            ]);
          break;
        case 'counselor':
          $replacements[$original] = $invite['counselor'];
          break;
        case 'message':
          $prefix = $opeka_config->get('opeka_invite_message');
          $message = $prefix && $invite['comment']
            ? $prefix . "\n\n" . $invite['comment']
            : $invite['comment'];

          $replacements[$original] = $message
            ? "\n\n" . $message . "\n\n"
            : "\n\n";
          break;
      }
    }
  }

  return $replacements;
}
