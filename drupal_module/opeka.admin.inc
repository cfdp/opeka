<?php
/**
 * @file
 * Admin pages for the Opeka module.
 */

/**
 * The admin-facing chat-page.
 */
function opeka_admin_page() {
  global $user;

  opeka_add_assets(array(
    'opeka.admin.css',
  ), array(
    'opeka.backend.js',
  ), array(
    'user' => array(
      'name' => $user->name,
      'uid' => (integer) $user->uid,
      'sid' => $user->sid,
      'admin' => TRUE,
    ),
  ));

  $output = array();

  // Load the templates we need for rendering.
  $template_path = dirname(__FILE__) . '/templates/';
  $output[] = file_get_contents($template_path . 'common.tmpl.html');
  $output[] = file_get_contents($template_path . 'backend.tmpl.html');

  return implode("\n", $output);
}

/**
 * Admin settings form for Opeka.
 */
function opeka_admin_settings_form($form, &$form_state) {
  form_load_include($form_state, 'admin.inc', 'lol_queue');

  $form['opeka_reg_pair_url'] = array(
    '#type' => 'textfield',
    '#title' => t('1-to-1 chat registration form'),
    '#description' => t('URL to a registration form, where counselors can enter data after a 1-to-1 chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_reg_pair_url', ''),
  );

  $form['opeka_reg_group_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Group chat registration form'),
    '#description' => t('URL to a registration form, where counselors can enter data after a group chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_reg_group_url', ''),
  );

  $form['opeka_pairchat_user_list'] = array(
    '#type' => 'checkbox',
    '#title' => t('Pair chat user list visibility'),
    '#description' => t('Toggle the user list visibility in the pair chat. Check it if the user list should be visible'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_pairchat_user_list', 0),
  );

  return system_settings_form($form);
}
