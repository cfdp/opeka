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
  form_load_include($form_state, 'admin.inc', 'opeka');

  $form['opeka_enter_site'] = array(
    '#type' => 'fieldset',
    '#title' => t('"Enter site" settings'),
    '#weight' => 3,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_enter_site']['opeka_enter_site_feature'] = array(
    '#type' => 'checkbox',
    '#title' => t('Enable "Enter site" feature'),
    '#description' => t('Enable the "Enter site" feature'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_enter_site_feature', 0),
  );

  $form['opeka_enter_site']['opeka_enter_site_message'] = array(
    '#type' => 'textarea',
    '#title' => t('"Enter site" message'),
    '#description' => t('A disclaimer message above the "Enter site" button.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_enter_site_message', t('Chat 100% anonymously with counselors from X municipality. NOTE: You can only chat if you are living in this municipality')),
    '#maxlength' => 200,
  );

  $form['opeka_enter_site']['opeka_enter_site_confirm'] = array(
    '#type' => 'textfield',
    '#title' => t('"Enter site" button text'),
    '#description' => t('Text on the "Enter site" button'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_enter_site_confirm', t('Yes, I am from X municipality')),
    '#maxlength' => 50,
  );

  $form['opeka_enter_site']['opeka_enter_site_leave'] = array(
    '#type' => 'textfield',
    '#title' => t('"Leave site" link text'),
    '#description' => t('Text on the "Leave site" link'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_enter_site_leave', t('I am from another municipality, what do I do?')),
    '#maxlength' => 50,
  );

  $form['opeka_sign_in_settings'] = array(
    '#type' => 'fieldset',
    '#title' => t('Sign in related settings'),
    '#weight' => 4,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_sign_in_settings']['opeka_age_min'] = array(
    '#type' => 'textfield',
    '#title' => t('Enter minimum age for clients'),
    '#description' => t('This is the minimum age that clients are presented with on the login form.'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_age_min', 9),
    '#maxlength' => 2,
  );

  $form['opeka_sign_in_settings']['opeka_age_max'] = array(
    '#type' => 'textfield',
    '#title' => t('Enter maximum age for clients'),
    '#description' => t('This is the maximum age that clients are presented with on the login form.'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_age_max', 23),
    '#maxlength' => 2,
  );

  $form['opeka_sign_in_settings']['opeka_welcome_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Welcome message'),
    '#maxlength' => 1024,
    '#description' => t('Text shown before user logs into the chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_welcome_message', ''),
  );

  $form['opeka_sign_in_settings']['opeka_signin_footnote'] = array(
    '#type' => 'textarea',
    '#title' => t('Signin footnote'),
    '#maxlength' => 1024,
    '#description' => t('Footnote below the signin form.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_signin_footnote', ''),
  );
  
  $form['opeka_sign_in_settings']['opeka_gender_show_nonbinary'] = [
    '#type' => 'checkbox',
    '#title' => t('Show the non-binary gender option on the signin form.'),
    '#description' => t('Show the non-binary gender option for regular users when logging in.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_gender_show_nonbinary', 1),
  ];
 
  $form['opeka_widget'] = array(
    '#type' => 'fieldset',
    '#title' => t('Widget settings'),
    '#weight' => 4,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_widget']['opeka_widget_header_button_subtext'] = array(
    '#type' => 'textfield',
    '#title' => t('Subtext for the header widget button'),
    '#description' => t('Text below the header widget button'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_widget_header_button_subtext', t('Chats are for young people aged 9 to 23 years.')),
    '#maxlength' => 200,
  );

  $form['opeka_widget']['opeka_widget_popup_text'] = array(
    '#type' => 'textfield',
    '#title' => t('Text for the popup widget'),
    '#description' => t('Text on the popup widget'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_widget_popup_text', t('Chat anonymously with a counselor')),
    '#maxlength' => 200,
  );

  $form['opeka_widget']['opeka_widget_popup_link_text'] = array(
    '#type' => 'textfield',
    '#title' => t('Text for the link'),
    '#description' => t('Text for the link'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_widget_popup_link_text', ''),
    '#maxlength' => 50,
  );

  $form['opeka_widget']['opeka_widget_popup_link_url'] = array(
    '#type' => 'textfield',
    '#title' => t('URL for the link'),
    '#description' => t('URL for the link'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_widget_popup_link_url', ''),
    '#maxlength' => 100,
  );
  
  $form['opeka_widget']['opeka_widget_popup_short_name'] = array(
    '#type' => 'textfield',
    '#title' => t('Short name of the chat.'),
    '#description' => t('This name is shown on the chat button in the popup widget.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_widget_popup_short_name', ''),
    '#maxlength' => 50,
  );

  $form['opeka_reg_urls'] = array(
    '#type' => 'fieldset',
    '#title' => t('Registration url settings'),
    '#weight' => 5,
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );

  $form['opeka_reg_urls']['opeka_reg_pair_url'] = array(
    '#type' => 'textfield',
    '#title' => t('1-to-1 chat registration form'),
    '#description' => t('URL to a registration form, where counselors can enter data after a 1-to-1 chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_reg_pair_url', ''),
  );

  $form['opeka_reg_urls']['opeka_reg_group_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Group chat registration form'),
    '#description' => t('URL to a registration form, where counselors can enter data after a group chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_reg_group_url', ''),
  );


  # $form['submit']['#validate'][] = 'opeka_admin_settings_form_validate';

  return system_settings_form($form);
}

/* Validate form input */
/* function opeka_admin_settings_form_validate(&$form, &$form_state) {
  
} */