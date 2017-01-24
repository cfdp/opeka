<?php
/**
 * @file
 * Admin form for the Opeka Opening hours submodule.
 */

/**
 * Admin settings form for Opeka Opening hours.
 */
function opeka_opening_hours_admin_form($form, &$form_state) {
  $weekdays_options = opeka_opening_hours_weekdays();

  $fieldset_id = 'fieldset-opeka-opening-hours-datetimes';
  $element_name = 'opeka_opening_hours_datetimes';
  $form['#opeka_multified_element_name'] = $element_name;

  // Check if the incoming values are there, otherwise, use the stored ones.
  $datetimes_input_values = isset($form_state['input'][$element_name]) ? $form_state['input'][$element_name] : [];
  $opeka_opening_hours_datetimes_array = $datetimes_input_values ?: variable_get('opeka_opening_hours_datetimes', []);
  $opeka_opening_hours_datetimes_array = array_filter($opeka_opening_hours_datetimes_array, function($array_el) {
    return !(empty($array_el['times_from']) && empty($array_el['times_to']));
  });
  // Add the fieldset that will wrap our datetimes widget list.
  $form[$element_name] = array(
    '#type' => 'fieldset',
    '#tree' => TRUE,
    '#title' => t('Opeka opening hours'),
    '#id' => $fieldset_id,
    '#prefix' => '<div id="' . $fieldset_id . '">',
    '#suffix' => '</div>',
    '#description' => '',
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );
  // Add as many datetimes widgets as the values we have, and one more.
  foreach ($opeka_opening_hours_datetimes_array as $idx=>$opeka_opening_hours_datetime) {
    $form[$element_name][] = array(
      'day' =>  array(
        '#type' => 'select',
        '#options' => $weekdays_options,
        '#default_value' => $opeka_opening_hours_datetime['day'],
        '#attributes' => array('class' => array('pull-left')),
      ),
      'times_from' => array(
        '#type' => 'textfield',
        '#default_value' => $opeka_opening_hours_datetime['times_from'],
        '#size' => 5,
        '#attributes' => array('class' => array('pull-left')),
      ),
      'times_to' => array(
        '#type' => 'textfield',
        '#default_value' => $opeka_opening_hours_datetime['times_to'],
        '#size' => 5,
      ),
      '#prefix' => '<div id="' . $element_name . '_' . $idx . '">',
      '#suffix' => '</div>',
    );
  }
  $form[$element_name][] = array(
    'day' =>  array(
      '#type' => 'select',
      '#options' => $weekdays_options,
      '#attributes' => array('class' => array('pull-left')),
    ),
    'times_from' => array(
      '#type' => 'textfield',
      '#size' => 5,
      '#attributes' => array('class' => array('pull-left')),
    ),
    'times_to' => array(
      '#type' => 'textfield',
      '#size' => 5,
    ),
  );

  // Add an "add more" button with ajax capabilities.
  $form[$element_name]['opeka_fapi_multifield_add_more'] = array(
    '#element_name' => $element_name,
    '#type' => 'submit',
    '#value' => t('Add one more'),
    '#name' => 'opeka_opening_hours_datetimes_add_more',
    '#submit' => array('opeka_fapi_multifield_submit_add_more'),
    '#ajax' => array(
      'callback' => 'opeka_fapi_multifield_ajax',
      'wrapper' => $fieldset_id,
    ),
  );

  // This is the opening hours message.
  $form['opeka_opening_hours_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat schedule message'),
    '#description' => t('The message for the upcoming chat sessions'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_opening_hours_message', t('You can chat with the counselors from Aarhus according to the following schedule.')),
  );

  // Our submit function will take care of removing empty values, if needed.
  $form['#submit'][] = 'opeka_opening_hours_admin_form_submit';
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
 * namely those where times (textfield) is empty.
 */
function opeka_opening_hours_admin_form_submit($form, &$form_state) {
  $element_name = $form['#opeka_multified_element_name'];
  $form_state['values'][$element_name] = array_filter($form_state['values'][$element_name], function($array_el) {
    return !(empty($array_el['times_from']) && empty($array_el['times_to']));
  });
}
