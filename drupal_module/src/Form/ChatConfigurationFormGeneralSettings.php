<?php

namespace Drupal\opeka\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Session\AccountProxy;

/**
 * Class ChatConfigurationForm.
 */
class ChatConfigurationFormGeneralSettings extends ConfigFormBase {

  /**
   * Class constructor.
   */
  public function __construct(ConfigFactoryInterface $config_factory, AccountProxy $current_user) {
    $this->configFactory = $config_factory;
    $this->currentUser = $current_user;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('config.factory'),
      $container->get('current_user')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'opeka_admin_general_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'opeka.general_settings',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {

    $config = $this->config('opeka.general_settings');

    $form['enter_site'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('"Enter site" settings'),
      '#collapsible' => TRUE,
      '#collapsed' => FALSE,
    ];

    $form['enter_site']['enter_site_feature'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable "Enter site" feature'),
      '#description' => $this->t('Enable the "Enter site" feature'),
      '#required' => FALSE,
      '#default_value' => $config->get('enter_site_feature'),
    ];

    $form['enter_site']['enter_site_message'] = [
      '#type' => 'textarea',
      '#title' => $this->t('"Enter site" message'),
      '#description' => $this->t('A disclaimer message above the "Enter site" button.'),
      '#required' => FALSE,
      '#default_value' => $config->get('enter_site_message'),
      '#maxlength' => 200,
    ];

    $form['enter_site']['enter_site_confirm'] = [
      '#type' => 'textfield',
      '#title' => $this->t('"Enter site" button text'),
      '#description' => $this->t('Text on the "Enter site" button'),
      '#required' => FALSE,
      '#default_value' => $config->get('enter_site_confirm'),
      '#maxlength' => 50,
    ];

    $form['enter_site']['enter_site_leave'] = [
      '#type' => 'textfield',
      '#title' => $this->t('"Leave site" link text'),
      '#description' => $this->t('Text on the "Leave site" link'),
      '#required' => FALSE,
      '#default_value' => $config->get('enter_site_leave'),
      '#maxlength' => 50,
    ];

    $form['widget'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Opeka widget settings'),
      '#collapsible' => TRUE,
      '#collapsed' => FALSE,
    ];

    $form['widget']['widget_header_button_subtext'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Subtext for the header widget button'),
      '#description' => $this->t('Text below the header widget button'),
      '#required' => FALSE,
      '#default_value' => $config->get('widget_header_button_subtext'),
      '#maxlength' => 200,
    ];

    $form['widget']['widget_popup_text'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Text for the popup widget'),
      '#description' => $this->t('Text on the popup widget'),
      '#required' => FALSE,
      '#default_value' => $config->get('widget_popup_text'),
      '#maxlength' => 200,
    ];

    $form['widget']['widget_popup_link_text'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Text for the link'),
      '#description' => $this->t('Text for the link'),
      '#required' => FALSE,
      '#default_value' => $config->get('widget_popup_link_text'),
      '#maxlength' => 50,
    ];

    $form['widget']['widget_popup_link_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('URL for the link'),
      '#description' => $this->t('URL for the link'),
      '#required' => FALSE,
      '#default_value' => $config->get('widget_popup_link_url'),
      '#maxlength' => 100,
    ];

    $form['sign_in_settings'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Opeka sign in related settings'),
      '#collapsible' => TRUE,
      '#collapsed' => FALSE,
    ];

    $form['sign_in_settings']['age_min'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Enter minimum age for clients'),
      '#description' => $this->t('This is the minimum age that clients are presented with on the login form.'),
      '#required' => TRUE,
      '#default_value' => $config->get('age_min'),
      '#maxlength' => 2,
    ];

    $form['sign_in_settings']['age_max'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Enter maximum age for clients'),
      '#description' => $this->t('This is the maximum age that clients are presented with on the login form.'),
      '#required' => TRUE,
      '#default_value' => $config->get('age_max'),
      '#maxlength' => 2,
    ];

    $form['sign_in_settings']['welcome_message'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Welcome message'),
      '#maxlength' => 1024,
      '#description' => $this->t('Text shown before user logs into the chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('welcome_message'),
    ];

    $form['sign_in_settings']['signin_footnote'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Signin footnote'),
      '#maxlength' => 1024,
      '#description' => $this->t('Footnote below the signin form.'),
      '#required' => FALSE,
      '#default_value' => $config->get('signin_footnote'),
    ];

    $form['reg_urls'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Opeka registration url settings'),
      '#collapsible' => TRUE,
      '#collapsed' => FALSE,
    ];

    $form['reg_urls']['reg_pair_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('1-to-1 chat registration form'),
      '#description' => $this->t('URL to a registration form, where counselors can enter data after a 1-to-1 chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('reg_pair_url'),
    ];

    $form['reg_urls']['reg_group_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Group chat registration form'),
      '#description' => $this->t('URL to a registration form, where counselors can enter data after a group chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('reg_group_url'),
    ];

    $form['actions']['submit'] = [
      '#type' => 'submit',
      '#value' => $this->t('Submit'),
      '#button_type' => 'primary',
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $opeka_settings_config = $this->configFactory->getEditable('opeka.general_settings');
    foreach ($form_state->getValues() as $key => $value) {
      $opeka_settings_config->set($key, $form_state->getValue($key));
    }
    $opeka_settings_config->save();
    parent::submitForm($form, $form_state);
  }

}
