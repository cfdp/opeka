<?php

/**
 * Advanced admin settings form for Opeka.
 */
function opeka_admin_advanced_settings_form($form, &$form_state) {
  form_load_include($form_state, 'admin.inc', 'opeka');

  $form['opeka_connectjs_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Opeka server URL'),
    '#description' => t('URL to the Opeka connect.js javascript, eg. http://localhost:3000/connect.js'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_connectjs_url', ''),
  );

  $form['opeka_custom_css'] = array(
    '#type' => 'textfield',
    '#title' => t('Custom css file'),
    '#description' => t('URL to a custom css, where additional styles can be added.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_custom_css', ''),
  );

  $form['opeka_client_login_sound'] = array(
    '#type' => 'textfield',
    '#title' => t('Login sound file'),
    '#description' => t('URL to a sound file that is played for the counselor when a client logs in.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_client_login_sound', '../sites/all/modules/custom/opeka/media/bell.mp3'),
  );

  $form['opeka_pairchat_user_list'] = array(
    '#type' => 'checkbox',
    '#title' => t('Pair chat user list visibility for clients'),
    '#description' => t('Toggle the user list visibility in the pair chat. Check it if the user list should be visible to clients.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_pairchat_user_list', 0),
  );

  $form['opeka_pairchat_room_list_entry'] = array(
    '#type' => 'checkbox',
    '#title' => t('Pair chat room list entry'),
    '#description' => t('Check this if the user should be sent to the room list instead of joining the first available room.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_pairchat_room_list_entry', 0),
  );

  $form['opeka_clients_writing_message'] = array(
    '#type' => 'checkbox',
    '#title' => t('Clients can see the "User is writing" message'),
    '#description' => t('Toggle the ability for clients to see the "User is writing" message. Check it if the clients should be able to see the message.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_clients_writing_message', 0),
  );

  $form['opeka_chat_names'] = array(
    '#type' => 'fieldset',
    '#title' => t('Opeka chat name settings'),
    '#weight' => 4,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_chat_names']['opeka_pair_chat_name'] = array(
    '#type' => 'textfield',
    '#title' => t('Pair chat name'),
    '#description' => t('The pair chat name can be shown in some chat widgets'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_pair_chat_name', ''),
  );

  $form['opeka_chat_names']['opeka_group_chat_name'] = array(
    '#type' => 'textfield',
    '#title' => t('Group chat name'),
    '#description' => t('The group chat name can be shown in some chat widgets'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_group_chat_name', ''),
  );

  $form['opeka_feedback'] = array(
    '#type' => 'fieldset',
    '#title' => t('Opeka feedback settings'),
    '#weight' => 4,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_feedback']['opeka_feedback_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Feedback URL'),
    '#description' => t('URL to a feedback page, e.g. a Google Form, where clients can enter evaluation data after a chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_feedback_url', ''),
  );

  $form['opeka_feedback']['opeka_groupchat_feedback_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Group Chat feedback URL'),
    '#description' => t('URL to a feedback page, e.g. a Google Form, where group chat clients can enter evaluation data after a chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_groupchat_feedback_url', ''),
  );

  $form['opeka_feedback']['opeka_feedback_auto_redirect'] = array(
    '#type' => 'checkbox',
    '#title' => t('Automatic redirection to questionnaire in external window?'),
    '#description' => t('Check this box if the feedback form should be opened automatically for clients.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_feedback_auto_redirect', 0),
  );

  $form['opeka_widget_advanced'] = array(
    '#type' => 'fieldset',
    '#title' => t('Opeka widget settings'),
    '#weight' => 4,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_widget_advanced']['opeka_client_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Popup widget'),
    '#description' => t('If the popup or the multi widgets are used, please provide the URL of the client site, eg. http://mysite.com.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_client_url', ''),
  );
  
  $form['opeka_widget_advanced']['opeka_mixed_widget_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Mixed widget'),
    '#description' => t('If the mixed widget is used, please provide the URL of the jsonp resource, e.g. https://mysite.com/resource?.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_mixed_widget_url', ''),
  );

  $form['opeka_reconnect'] = array(
    '#type' => 'checkbox',
    '#title' => t('Allow reconnection'),
    '#description' => t('Once checked, browser will try to reconnect to the server once the connection lost.'),
    '#default_value' => variable_get('opeka_reconnect', TRUE),
  );

  $form['opeka_reconnect_attempts'] = array(
    '#type' => 'textfield',
    '#title' => t('Max reconnection attempts'),
    '#description' => t('Number of times a browser will attempt to reconnect.'),
    '#default_value' => variable_get('opeka_reconnect_attempts', 3),
    '#element_validate' => array('element_validate_integer_positive'),
    '#states' => array(
      'visible' => array(
        ':input[name="opeka_reconnect"]' => array('checked' => TRUE),
      ),
    ),
  );

  $form['opeka_reconnect_interval'] = array(
    '#type' => 'textfield',
    '#title' => t('Reconnection interval (ms)'),
    '#description' => t('Interval in milliseconds between reconnection attempts.'),
    '#default_value' => variable_get('opeka_reconnect_interval', 20000),
    '#element_validate' => array('element_validate_integer_positive'),
    '#states' => array(
      'visible' => array(
        ':input[name="opeka_reconnect"]' => array('checked' => TRUE),
      ),
    ),
  );

  $form['submit']['#validate'][] = 'opeka_admin_advanced_settings_form_validate';
  return system_settings_form($form);
}

/* Validate form input */
function opeka_admin_advanced_settings_form_validate(&$form, &$form_state) {
  $file = $form_state['input']['opeka_custom_css'];
  $file_headers = @get_headers($file);
  if($file_headers[0] == 'HTTP/1.1 404 Not Found') {
    form_set_error('opeka_custom_css', t('The URL in the custom CSS field returned 404 not found. Please make sure the the URL is correct.'));
  }
  else {
      $exists = true;
  }
}
