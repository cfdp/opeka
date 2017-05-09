<?php
/**
 * @file
 * Admin form for the Opeka Screening Questions submodule.
 */

/**
 * Admin settings form for Opeka Screening Questions.
 */
function opeka_screening_admin_form($form, &$form_state) {

  $fieldset_id = 'fieldset-opeka-screening-options';
  $element_name = 'opeka_screening_options';
  $form['#opeka_multified_element_name'] = $element_name;

  // Check if the incoming values are there, otherwise, use the stored ones.
  $question_input_values = isset($form_state['input'][$element_name]) ? $form_state['input'][$element_name] : [];
  $opeka_screening_options_array = $question_input_values ?: variable_get('opeka_screening_options', []);
  $opeka_screening_options_array = array_filter($opeka_screening_options_array, function($array_el) {
    return !(empty($array_el['answer_option']));
  });

  // This is the main question.
  $form['opeka_screening_main'] = array(
    '#type' => 'textarea',
    '#title' => t('Screening question'),
    '#description' => t('The question you want to pose to the users.'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_screening_main', t('Question...')),
    '#maxlength' => 185,
  );
  // Add the fieldset that will wrap our answer option widget list.
  $form[$element_name] = array(
    '#type' => 'fieldset',
    '#tree' => TRUE,
    '#id' => $fieldset_id,
    '#prefix' => '<div id="' . $fieldset_id . '">',
    '#suffix' => '</div>',
    '#description' => '',
  );
  // Add as many answer options as the values we have, and one more.
  foreach ($opeka_screening_options_array as $idx=>$opeka_screening_options) {
    $form[$element_name][] = array(
      'answer_option' => array(
        '#type' => 'textfield',
        '#default_value' => $opeka_screening_options['answer_option'],
        '#size' => 80,
        '#attributes' => array('class' => array('clearfix'), 'placeholder' => t('Answer option...'), 'required' => TRUE),
      ),
      '#prefix' => '<div id="' . $element_name . '_' . $idx . '">',
      '#suffix' => '</div>',
    );
  }
  $form[$element_name][] = array(
    'answer_option' => array(
      '#type' => 'textfield',
      '#size' => 80,
      '#attributes' => array('class' => array('clearfix'), 'placeholder' => t('Answer option...')),
    ),
  );

  // Add an "add more" button with ajax capabilities.
  $form[$element_name]['opeka_fapi_multifield_add_more'] = array(
    '#element_name' => $element_name,
    '#type' => 'submit',
    '#value' => t('Add one more option'),
    '#name' => 'opeka_screening_options_add_more',
    '#submit' => array('opeka_fapi_multifield_submit_add_more'),
    '#attributes' => array('class' => array('clearfix')),
    '#ajax' => array(
      'callback' => 'opeka_fapi_multifield_ajax',
      'wrapper' => $fieldset_id,
    ),
  );
  $form['#attached']['css'][] = drupal_get_path('module', 'opeka') . '/css/' . 'opeka.forms.css';

  // Our submit function will take care of removing empty values, if needed.
  $form['#submit'][] = 'opeka_screening_admin_form_submit';
  return system_settings_form($form);
}

/**
 * This function will simply return the updated fieldset part of the form.
 */
function opeka_fapi_multifield_ajax($form, $form_state) {
  $element_name = $form_state['triggering_element']['#element_name'];
  return $form[$element_name];
}

/**
 * This function will make sure the form is rebuilt.
 */
function opeka_fapi_multifield_submit_add_more($form, &$form_state, $arg) {
  $form_state['rebuild'] = TRUE;
}

/**
 * This function will remove empty entries,
 * namely those where answer option (textfield) is empty.
 */
function opeka_screening_admin_form_submit($form, &$form_state) {
  $element_name = $form['#opeka_multified_element_name'];
  $form_state['values'][$element_name] = array_filter($form_state['values'][$element_name], function($array_el) {
    return !(empty($array_el['answer_option']));
  });
}
