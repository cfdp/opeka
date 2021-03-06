<?php

/** 
 * Generate a table with user data and screening results
 * 
 * @todo: add db column with counselor name and populate it if is has no value in this function
 **/

function opeka_statistics_display_results_table() {
  $header = array(
    array('data' => t('Date'), 'field' => 'submission_date', 'sort' => 'desc'),
    array('data' => t('Counselor'), 'field' => 'counselor_uid', 'sort' => 'desc'),
    array('data' => t('Chat duration (min)'), 'field' => 'chat_duration'),
    array('data' => t('Age'), 'field' => 'age'),
    array('data' => t('Gender'), 'field' => 'gender'),
    array('data' => t('Question'), 'field' => 'question'),
    array('data' => t('Answer'), 'field' => 'answer'),
  );

  // Get a paged list of all the submission data
  $query = db_select('opeka_stats', 'n')
    //->condition('status', 1) //Only published nodes, change condition as it suits you
    ->extend('PagerDefault')//Pager Extender
    ->limit(50)//10 results per page
    ->extend('TableSort')//Sorting Extender
    ->orderByHeader($header)//Field to sort on is picked from $header
    ->fields('n', array(
      'submission_date',
      'counselor_uid',
      'chat_duration',
      'age',
      'gender',
      'question',
      'answer',
    ));

  $results = $query->execute();
  $rows = array();
  foreach ($results as $subm) {
    $uid = $subm->counselor_uid;
    if (!empty($uid)) {
      $counselor = user_load($uid);
    }
    $rows[] = array(
      'data' => array(
        format_date($subm->submission_date),
        $counselor !== NULL ? $counselor->name : t("-"),
        $subm->chat_duration !== NULL ? $subm->chat_duration : t('-'),
        $subm->age !== ("") ? $subm->age : t("-"),
        _opeka_statistics_expand_gender($subm->gender),
        $subm->question,
        $subm->answer
      )
    );
  }

  $html = theme('table', array(
      'header' => $header,
      'rows' => $rows,
      //Optional to indicate whether the table headers should be sticky
      'sticky' => TRUE,
      //Optional empty text for the table if resultset is empty
      'empty' => t('No screening results yet...'),
    )
  );

  $html .= theme('pager', array('tags' => array()));

  $total = _opeka_statistics_get_total();
  if (!$total) {
    $total = t("None");
  }

  $total_last_month = _opeka_statistics_get_last_month();

  if (!$total_last_month) {
    $total_last_month = t("None");
  }
  $html_pre = "<div><p>" . t('Total number of chat sessions: ') . $total . "</p></div>";
  $html_pre .= "<div><p>" . t('Total number of chat sessions last 4 weeks: ') . $total_last_month . "</p></div>";
  return ($html_pre . $html);
}

function _opeka_statistics_expand_gender($gender) {
  switch ($gender) {
    case "f":
      $res = t("female");
      break;
    case "m":
      $res = t("male");
      break;
    case "n":
      $res = t("non-binary");
      break;
    default:
      $res = t("-");
  }
  return $res;
}

/** Get the total number of submissions
 *
 */
function _opeka_statistics_get_total() {
  $result = db_query("SELECT COUNT(*) FROM {opeka_stats}");
  $count = $result->fetchField(0);

  return $count;
}

/** Get the number of submissions the last month
 *
 */
function _opeka_statistics_get_last_month() {
  $result = db_query("SELECT COUNT(*) FROM {opeka_stats} WHERE submission_date > :submission_date", array(
    ':submission_date' => REQUEST_TIME - 3600 * 24 * 28,
  ));
  $count = $result->fetchField(0);

  return $count;
}
