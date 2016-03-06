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

  $form['opeka_connectjs_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Opeka server URL'),
    '#description' => t('URL to the Opeka connect.js javascript, eg. http://localhost:3000/connect.js'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_connectjs_url', ''),
  );

  $form['opeka_schedule'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat schedule'),
    '#description' => t('The schedule for the upcoming chat sessions'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_schedule', ''),
  );
  
  $form['opeka_pair_chat_name'] = array(
    '#type' => 'textfield',
    '#title' => t('Pair chat name'),
    '#description' => t('The pair chat name can be shown in some chat widgets'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_pair_chat_name', ''),
  );
  
  $form['opeka_group_chat_name'] = array(
    '#type' => 'textfield',
    '#title' => t('Group chat name'),
    '#description' => t('The group chat name can be shown in some chat widgets'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_group_chat_name', ''),
  );

  $form['opeka_welcome_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Welcome message'),
    '#maxlength' => 1024,
    '#description' => t('Text shown before user logs into the chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_welcome_message', 'Welcome to the chat! You can customize this message at Admin => config => services => opeka'),
  );

  $form['opeka_client_login_sound'] = array(
    '#type' => 'textfield',
    '#title' => t('Login sound file'),
    '#description' => t('URL to a sound file that is played for the counselor when a client logs in.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_client_login_sound', '../sites/all/modules/custom/opeka/media/bell.mp3'),
  );

  $form['opeka_feedback_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Feedback URL'),
    '#description' => t('URL to a feedback page, e.g. a Google Form, where clients can enter evaluation data after a chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_feedback_url', ''),
  );

  $form['opeka_groupchat_feedback_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Group Chat feedback URL'),
    '#description' => t('URL to a feedback page, e.g. a Google Form, where group chat clients can enter evaluation data after a chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_groupchat_feedback_url', ''),
  );

  $form['opeka_feedback_auto_redirect'] = array(
    '#type' => 'checkbox',
    '#title' => t('Automatic redirection to questionnaire in external window?'),
    '#description' => t('Check this box if the feedback form should be opened automatically for clients.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_feedback_auto_redirect', 0),
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

  $form['opeka_client_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Popup widget'),
    '#description' => t('If the popup widget is used, please provide URL of client site, eg. http://mysite.com.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_client_url', ''),
  );

  $form['opeka_custom_css'] = array(
    '#type' => 'textfield',
    '#title' => t('Custom css file for widget styles'),
    '#description' => t('URL to a custom css file for the widgets.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_custom_css', ''),
  );

  $form['opeka_server_restart'] = array(
   '#type' => 'submit',
   '#value' => 'Restart server',
   '#submit' => array('opeka_restart_server')
  );

  $form['submit']['#validate'][] = 'opeka_admin_settings_form_validate';
  return system_settings_form($form);
}

/* Validate form input */
function opeka_admin_settings_form_validate(&$form, &$form_state) {
  $file = $form_state['input']['opeka_custom_css'];
  $file_headers = @get_headers($file);
  if($file_headers[0] == 'HTTP/1.1 404 Not Found') {
    form_set_error('opeka_custom_css', t('The URL in the custom CSS field returned 404 not found. Please make sure the the URL is correct.'));
  }
  else {
      $exists = true;
  }
}

function opeka_restart_server($form, &$form_state){
  global $base_url;
  $opeka_path = DRUPAL_ROOT . "/" . drupal_get_path('module', 'opeka');
  $output = shell_exec($opeka_path . '/scripts/restart_wrapper.sh '. $base_url);
  if ($output == NULL) {
    drupal_set_message(t('Something went wrong - the chat was not restarted. Please contact support if problem persists.'), 'status');
  }
  else {
    drupal_set_message($output, 'status');
  }
}
