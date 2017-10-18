<div class="status-wrapper popup">
  <div class="chat-name">
    <?php
      if ($variables['opeka_widget_roomtype'] == "pair"):
        print render($variables['opeka_pair_chat_name']);
      elseif ($variables['opeka_widget_roomtype'] == "group"):
        print render($variables['opeka_group_chat_name']);
      endif;
    ?>
  </div>
  <div class="login-button">
    <a id="join-chat" class="btn chat" href="#"></a>
  </div>
  <div class="status-content">
    <?php print render($variables['opeka_widget_popup_text']); ?>
    <?php if ($variables['opeka_widget_popup_link_url'] != '') : ?>
      <a class="popup-link" target="_parent" href="<?php print render($variables['opeka_widget_popup_link_url']); ?>"><?php print render($variables['opeka_widget_popup_link_text']); ?></a>
    <?php endif; ?>
  </div>
  <div class="button-wrapper">
    <a href="#" class="close opeka-chat-popup"></a>
  </div>
</div>
