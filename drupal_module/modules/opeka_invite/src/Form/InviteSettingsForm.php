<?php

namespace Drupal\opeka_invite\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Class InviteSettingsForm.
 */
class InviteSettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'opeka_invite.settings',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'invite_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('opeka_invite.settings');

    $form['description'] = [
      '#markup' => $this->t(
        '
        <p>You can use the following tokens:</p>
        <ul>
          <li><strong>[opeka_invite:name]</strong> for invitee name,</li> 
          <li><strong>[opeka_invite:mail]</strong> for invitee mail,</li> 
          <li><strong>[opeka_invite:chat]</strong> for chat name,</li> 
          <li><strong>[opeka_invite:date]</strong> for chat date and time,</li> 
          <li><strong>[opeka_invite:link]</strong> for invitation link,</li> 
          <li><strong>[opeka_invite:counselor]</strong> for counselor name,</li>
          <li><strong>[opeka_invite:message]</strong> for personal message with the prefix (see below).</li>
        </ul>'
      ),
    ];

    $form['invite'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Invitation email'),
    ];
    $form['invite']['opeka_invite_subject'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Subject'),
      '#default_value' => $config->get('opeka_invite_subject'),
    ];
    $form['invite']['opeka_invite_body'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Body'),
      '#default_value' => $config->get('opeka_invite_body'),
    ];
    $form['invite']['opeka_invite_message'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Personal message prefix'),
      '#description' => $this->t(
        'If a counselor leaves a personal message, the prefix will be displayed before the message.'
      ),
      '#default_value' => $config->get('opeka_invite_message'),
    ];

    $form['cancel_invite'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Cancellation email'),
    ];
    $form['cancel_invite']['opeka_invite_cancel_subject'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Subject'),
      '#default_value' => $config->get('opeka_invite_cancel_subject'),
    ];
    $form['cancel_invite']['opeka_invite_cancel_body'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Body'),
      '#default_value' => $config->get('opeka_invite_cancel_body'),
    ];

    $form['opeka_invite_expire'] = [
      '#title' => $this->t('Expiration time'),
      '#description' => $this->t(
        'The invites will be deleted after this time past since their scheduled date and time.'
      ),
      '#type' => 'select',
      '#options' => [
        0 => $this->t('Never delete'),
        1 => $this->t('1 hour'),
        6 => $this->t('6 hours'),
        12 => $this->t('12 hours'),
        24 => $this->t('1 day'),
        72 => $this->t('3 days'),
        168 => $this->t('1 week'),
        336 => $this->t('2 weeks'),
        672 => $this->t('4 weeks'),
      ],
      '#default_value' => $config->get('opeka_invite_expire'),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    parent::submitForm($form, $form_state);

    $this->config('opeka_invite.settings')
      ->set('opeka_invite_subject', $form_state->getValue('opeka_invite_subject'))
      ->set('opeka_invite_body', $form_state->getValue('opeka_invite_body'))
      ->set('opeka_invite_message', $form_state->getValue('opeka_invite_message'))
      ->set('opeka_invite_cancel_subject', $form_state->getValue('opeka_invite_cancel_subject'))
      ->set('opeka_invite_cancel_body', $form_state->getValue('opeka_invite_cancel_body'))
      ->set('opeka_invite_expire', $form_state->getValue('opeka_invite_expire'))
      ->save();
  }

}
