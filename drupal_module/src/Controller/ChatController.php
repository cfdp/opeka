<?php

namespace Drupal\opeka\Controller;

use Drupal\Core\Controller\ControllerBase;

/**
 * Class ChatController.
 */
class ChatController extends ControllerBase {

  /**
   * Action for the chat's main page.
   *
   * @return string
   *   Return page render array.
   */
  public function mainChatPage() {  
    return [
      '#theme' => 'opeka_chat',
    ];
  }

  /**
   * Action for the chat's admin page.
   *
   * @return string
   *   Return page render array.
   */
  public function adminChatPage() {  
    return [
      '#theme' => 'opeka_admin_chat',
    ];
  }

   /**
   * Action for the chat's header widget page.
   *
   * @return string
   *   Return page render array.
   */
  public function headerWidgetPage() {  
    return [
      '#theme' => 'opeka_header_widget',
    ];
  }

     /**
   * Action for the chat's popup widget page.
   *
   * @return string
   *   Return page render array.
   */
  public function popupWidgetPage() {  
    return [
      '#theme' => 'opeka_popup_widget',
    ];
  }

}
