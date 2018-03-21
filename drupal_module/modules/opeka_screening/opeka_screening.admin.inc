<?php
/**
 * @file
 * Admin form for the Opeka Screening Questions submodule.
 */

/**
 * Admin settings form for Opeka Screening Questions.
 */
function opeka_screening_admin_form($form, &$form_state) {

  $form['opeka_screening_required'] = array(
    '#type' => 'checkbox',
    '#title' => t('Mark the question required.'),
    '#description' => t('Check this box if answering the client should be required to answer the question before entering the chat.'),
    '#required' => FALSE,
    '#default_value' => variable_get('opeka_screening_required', 0),
  );

  $fieldset_id = 'fieldset-opeka-screening-options';
  $element_name = 'opeka_screening_options';
  $form['#opeka_multified_element_name'] = $element_name;

  // Check if the incoming values are there, otherwise, use the stored ones.
  $question_input_values = isset($form_state['input'][$element_name]) ? $form_state['input'][$element_name] : [];
  $opeka_screening_options_array = $question_input_values ?: variable_get('opeka_screening_options', []);
  $opeka_screening_options_array = array_filter($opeka_screening_options_array, function ($item) {
    return !empty($item['answer_option']);
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
    '#prefix' => '<div id="' . $fieldset_id . '" class="control-group">',
    '#suffix' => '</div>',
    '#description' => '',
  );
  // Add as many answer options as the values we have, and one more.
  foreach ($opeka_screening_options_array as $delta => $opeka_screening_options) {
    $form[$element_name][$delta] = array(
      'answer_option' => array(
        '#type' => 'textfield',
        '#default_value' => $opeka_screening_options['answer_option'],
        '#size' => 80,
        '#attributes' => array(
          'class' => array('clearfix'),
          'placeholder' => t('Answer option...'),
          'required' => TRUE,
        ),
      ),
      'remove' => array(
        '#element_name' => $element_name,
        '#type' => 'submit',
        '#value' => t('Remove'),
        '#submit' => array('opeka_screening_submit_remove_one'),
        '#name' => $fieldset_id . '_remove_' . $delta,
        '#ajax' => array(
          'callback' => 'opeka_screening_ajax',
          'wrapper' => $fieldset_id,
        ),
      ),
      '#prefix' => '<div id="' . $element_name . '_' . $delta . '" class="control-group">',
      '#suffix' => '</div>',
    );
  }
  $form[$element_name][] = array(
    'answer_option' => array(
      '#type' => 'textfield',
      '#size' => 80,
      '#attributes' => array(
        'class' => array('clearfix'),
        'placeholder' => t('Answer option...'),
      ),
      '#prefix' => '<div class="control-group">',
      '#suffix' => '</div>',
    ),
  );

  // Add an "add more" button with ajax capabilities.
  $form[$element_name]['opeka_screening_add_more'] = array(
    '#element_name' => $element_name,
    '#type' => 'submit',
    '#value' => t('Add one more option'),
    '#name' => 'opeka_screening_options_add_more',
    '#submit' => array('opeka_screening_submit_add_more'),
    '#attributes' => array('class' => array('clearfix control-group')),
    '#ajax' => array(
      'callback' => 'opeka_screening_ajax',
      'wrapper' => $fieldset_id,
    ),
  );
  $form['#attached']['css'][] = drupal_get_path('module', 'opeka_screening') . '/css/opeka_screening.forms.css';

  // Our submit function will take care of removing empty values, if needed.
  $form['#submit'][] = 'opeka_screening_admin_form_submit';
  return system_settings_form($form);
}

/**
 * This function will simply return the updated fieldset part of the form.
 */
function opeka_screening_ajax($form, $form_state) {
  $element_name = $form_state['triggering_element']['#element_name'];
  return $form[$element_name];
}

/**
 * Rebuild the form.
 *
 * The new item will be added in the form callback automatically.
 */
function opeka_screening_submit_add_more($form, &$form_state, $arg) {
  $form_state['rebuild'] = TRUE;
}

/**
 * Delete requested item.
 */
function opeka_screening_submit_remove_one($form, &$form_state, $arg) {
  $parents = $form_state['triggering_element']['#parents'];

  // Remove button key.
  array_pop($parents);

  // Fetch delta.
  $delta = array_pop($parents);

  // Delete item.
  $input = &drupal_array_get_nested_value($form_state['input'], $parents);
  if (isset($input[$delta])) {
    unset($input[$delta]);
  }
  $input = array_values($input);

  $form_state['rebuild'] = TRUE;
}

/**
 * This function will remove empty entries,
 * namely those where answer option (textfield) is empty.
 */
function opeka_screening_admin_form_submit($form, &$form_state) {
  $element_name = $form['#opeka_multified_element_name'];
  $form_state['values'][$element_name] = array_filter($form_state['values'][$element_name], function ($array_el) {
    return !(empty($array_el['answer_option']));
  });
}
