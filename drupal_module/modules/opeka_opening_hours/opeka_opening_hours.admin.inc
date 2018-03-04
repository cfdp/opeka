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
  $help_text = t('Adjust opening hours here by defining the time intervals when the chat will be open.');
  $form['#prefix'] = '<p>'.$help_text.'</p>';

  // Check if the incoming values are there, otherwise, use the stored ones.
  $datetimes_input_values = isset($form_state['input'][$element_name]) ? $form_state['input'][$element_name] : [];
  $opeka_opening_hours_datetimes_array = $datetimes_input_values ?: variable_get('opeka_opening_hours_datetimes', []);
  $opeka_opening_hours_datetimes_array = array_filter($opeka_opening_hours_datetimes_array, function($item) {
    return !(empty($item['times_from']) && empty($item['times_to']));
  });
  // Add the fieldset that will wrap our datetimes widget list.
  $form[$element_name] = array(
    '#type' => 'fieldset',
    '#tree' => TRUE,
    '#id' => $fieldset_id,
    '#prefix' => '<div id="' . $fieldset_id . '" class="control-group">',
    '#suffix' => '</div>',
    '#description' => '',
  );
  // Add as many datetimes widgets as the values we have, and one more.
  foreach ($opeka_opening_hours_datetimes_array as $delta=>$opeka_opening_hours_datetime) {
    $form[$element_name][$delta] = array(
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
        '#attributes' => array('class' => array('pull-left'), 'placeholder' => t('From')),
      ),
      'times_to' => array(
        '#type' => 'textfield',
        '#default_value' => $opeka_opening_hours_datetime['times_to'],
        '#size' => 5,
        '#attributes' => array('placeholder' => t('To')),
      ),
      'remove' => array(
        '#element_name' => $element_name,
        '#type' => 'submit',
        '#value' => t('Remove'),
        '#submit' => array('opeka_opening_hours_submit_remove_one'),
        '#name' => $fieldset_id . '_remove_' . $delta,
        '#ajax' => array(
          'callback' => 'opeka_opening_hours_ajax',
          'wrapper' => $fieldset_id,
        ),
      ),
      '#prefix' => '<div id="' . $element_name . '_' . $delta . '" class="control-group">',
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
      '#attributes' => array('class' => array('pull-left'), 'placeholder' => t('From')),
    ),
    'times_to' => array(
      '#type' => 'textfield',
      '#size' => 5,
      '#attributes' => array('placeholder' => t('To')),
    ),
  );

  // Add an "add more" button with ajax capabilities.
  $form[$element_name]['opeka_opening_hours_add_more'] = array(
    '#element_name' => $element_name,
    '#type' => 'submit',
    '#value' => t('Add one more'),
    '#name' => 'opeka_opening_hours_datetimes_add_more',
    '#submit' => array('opeka_opening_hours_submit_add_more'),
    '#attributes' => array('class' => array('clearfix control-group')),
    '#ajax' => array(
      'callback' => 'opeka_opening_hours_ajax',
      'wrapper' => $fieldset_id,
    ),
  );

  // This is the opening hours message.
  $form['opeka_opening_hours_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat schedule message'),
    '#description' => t('The message for the upcoming chat sessions'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_opening_hours_message', t('You can chat with the counselors according to the following schedule.')),
    '#maxlength' => 85,
  );

  $form['#attached']['css'][] = drupal_get_path('module', 'opeka') . '/css/opeka_opening_hours.forms.css';
  
  // Our submit function will take care of removing empty values, if needed.
  $form['#submit'][] = 'opeka_opening_hours_admin_form_submit';
  return system_settings_form($form);
}

/**
 * This function will simply return the updated fieldset part of the form.
 */
function opeka_opening_hours_ajax($form, $form_state) {
  $element_name = $form_state['triggering_element']['#element_name'];
  return $form[$element_name];
}

/**
 * This function will make sure the form is rebuilt.
 */
function opeka_opening_hours_submit_add_more($form, &$form_state, $arg) {
  $form_state['rebuild'] = TRUE;
}


/**
 * Delete requested item.
 */
function opeka_opening_hours_submit_remove_one($form, &$form_state, $arg) {
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
 * namely those where times (textfield) is empty.
 */
function opeka_opening_hours_admin_form_submit($form, &$form_state) {
  $element_name = $form['#opeka_multified_element_name'];
  $form_state['values'][$element_name] = array_filter($form_state['values'][$element_name], function($array_el) {
    return !(empty($array_el['times_from']) && empty($array_el['times_to']));
  });
}
