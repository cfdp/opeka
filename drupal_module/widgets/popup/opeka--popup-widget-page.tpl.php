<div class="status-wrapper popup">
  <div class="login-button">
    <a id="join-chat" class="btn chat popup" href="#">
      <?php if (($variables['opeka_widget_room_type'] == 'group') && ($variables['opeka_widget_popup_short_name_group'] != '')): ?>
        <?php print render($variables['opeka_widget_popup_short_name_group']); ?>
      <?php else: ?>
        <?php if ($variables['opeka_widget_popup_short_name'] != '') : ?>
          <?php print render($variables['opeka_widget_popup_short_name']) ?>
        <?php endif; ?>
      <?php endif; ?>
    </a>
  </div>
  <div class="status-content">
    <?php print render($variables['opeka_widget_popup_text']); ?>
    <?php if ($variables['opeka_widget_popup_link_url'] != '') : ?>
      <a class="popup-link" target="_parent" href="<?php print render($variables['opeka_widget_popup_link_url']); ?>"><?php print render($variables['opeka_widget_popup_link_text']); ?></a>
    <?php endif; ?>
  </div>
</div>
