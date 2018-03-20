<?php

/**
 * @file
 * Views integration for the Opeka module.
 */

/**
 * Implements hook_views_data().
 */
function opeka_views_data() {
  $data = [
    'opeka_stats' => [],
  ];

  $data['opeka_stats']['table'] = [
    'group' => t('Opeka stats'),
    'provider' => 'opeka',
    'base' => [
      'field' => 'submission_id',
      'title' => t('Opeka stats table'),
      'help' => t('Opeka stats table contains chat log information.'),
    ],
  ];

  $data['opeka_stats']['submission_id'] = [
    'title' => t('Submission id'),
    'help' => t('Submission id.'),
    'field' => [
      'id' => 'numeric',
    ],
    'sort' => [
      'id' => 'standard',
    ],
    'filter' => [
      'id' => 'standard',
    ],
    'argument' => [
      'id' => 'standard',
    ],
  ];

  $data['opeka_stats']['gender'] = [
    'title' => t('Gender'),
    'help' => t('Gender.'),
    'field' => [
      'id' => 'standard',
    ],
    'sort' => [
      'id' => 'standard',
    ],
    'filter' => [
      'id' => 'string',
    ],
    'argument' => [
      'id' => 'string',
    ],
  ];

  $data['opeka_stats']['age'] = [
    'title' => t('Age'),
    'help' => t('Age.'),
    'field' => [
      'id' => 'standard',
    ],
    'sort' => [
      'id' => 'standard',
    ],
    'filter' => [
      'id' => 'string',
    ],
    'argument' => [
      'id' => 'string',
    ],
  ];

  $data['opeka_stats']['question'] = [
    'title' => t('Question text'),
    'help' => t('Question text.'),
    'field' => [
      'id' => 'standard',
    ],
    'sort' => [
      'id' => 'standard',
    ],
    'filter' => [
      'id' => 'string',
    ],
    'argument' => [
      'id' => 'string',
    ],
  ];

  $data['opeka_stats']['answer'] = [
    'title' => t('Answer text'),
    'help' => t('Answer text.'),
    'field' => [
      'id' => 'standard',
    ],
    'sort' => [
      'id' => 'standard',
    ],
    'filter' => [
      'id' => 'string',
    ],
    'argument' => [
      'id' => 'string',
    ],
  ];

  $data['opeka_stats']['submission_date'] = [
    'title' => t('Submission date'),
    'help' => t('Submission date.'),
    'field' => [
      'id' => 'date',
    ],
    'sort' => [
      'id' => 'date',
    ],
    'filter' => [
      'id' => 'date',
    ],
  ];

  $data['opeka_stats']['chat_duration'] = [
    'title' => t('Session duration (mins)'),
    'help' => t('Session duration in minutes.'),
    'field' => [
      'id' => 'numeric',
    ],
    'sort' => [
      'id' => 'standard',
    ],
    'filter' => [
      'id' => 'numeric',
    ],
    'argument' => [
      'id' => 'numeric',
    ],
  ];

  return $data;
}
