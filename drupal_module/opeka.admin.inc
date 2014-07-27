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

  $form['opeka_nowjs_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Opeka server URL'),
    '#description' => t('URL to the Spravka webservice JavaScript start point, eg. http://localhost:3000/nowjs/now.js'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_nowjs_url', ''),
  );

  $form['opeka_schedule'] = array(
    '#type' => 'textarea',
    '#title' => t('Group chat schedule'),
    '#description' => t('The schedule for the upcoming group chat sessions'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_schedule', ''),
  );

  $form['opeka_welcome_message'] = array(
    '#type' => 'textfield',
    '#title' => t('Welcome message'),
    '#description' => t('Text shown before user logs into the chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_welcome_message', ''),
  );

  $form['opeka_client_login_sound'] = array(
    '#type' => 'textfield',
    '#title' => t('Login sound file'),
    '#description' => t('URL to a sound file that is played for the counselor when a client logs in.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_client_login_sound', '../sites/all/modules/custom/opeka/media/bell.wav'),
  );

  $form['opeka_feedback_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Feedback URL'),
    '#description' => t('URL to a feedback page, e.g. a Google Form, where clients can enter evaluation data after a chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_feedback_url', ''),
  );

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

  $form['opeka_server_restart'] = array(
   '#type' => 'submit',
   '#value' => 'Restart server',
   '#submit' => array('opeka_restart_server')
  );

  // $form['opeka_server_start'] = array(
  //   '#type' => 'submit',
  //   '#value' => 'Start server',
  //   '#submit' => array('opeka_start_server')
  // );

  // $form['opeka_server_stop'] = array(
  //   '#type' => 'submit',
  //   '#value' => 'Stop server',
  //   '#submit' => array('opeka_stop_server')
  //   );
  
  return system_settings_form($form);
}

function opeka_restart_server($form, &$form_state){
 global $base_url;
 $opeka_path = DRUPAL_ROOT . "/" . drupal_get_path('module', 'opeka');
 $output = shell_exec($opeka_path . '/scripts/restart_wrapper.sh');
 if ($output == NULL) {
   drupal_set_message(t('Something went wrong - the chat was not restarted'), 'status');
 }
 else {
   drupal_set_message($output, 'status');
 }
}

// function opeka_start_server($form, &$form_state){
//   global $base_url;
//   $opeka_path = DRUPAL_ROOT . "/" . drupal_get_path('module', 'opeka');
//   $output = shell_exec($opeka_path . '/scripts/startchat.sh');
//   if ($output == NULL) {
//     drupal_set_message(t('Something went wrong - the chat was not started'), 'status');
//   }
//   else {
//     drupal_set_message($output, 'status');
//   }
// }

// function opeka_stop_server($form, &$form_state){
//   global $base_url;
//   $opeka_path = DRUPAL_ROOT . "/" . drupal_get_path('module', 'opeka');
//   $output = shell_exec($opeka_path . '/scripts/stopchat.sh');
//   if ($output == NULL) {
//     drupal_set_message(t('Something went wrong - the chat was not stopped'), 'status');
//   }
//   else {
//     drupal_set_message($output, 'status');
//   }
// }
