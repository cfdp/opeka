<?php

/** Generate a table with screening results
*
* Inspired by http://www.rahulsingla.com/blog/2011/05/drupal-7-creating-drupal-style-tables-with-paging-sorting-and-sticky-headers
**/

function opeka_statistics_display_results_table() {
  $header = array(
    array('data' => t('Date'), 'field' => 'submission_date', 'sort' => 'asc'),
    array('data' => t('ID'), 'field' => 'submission_id'),
    array('data' => t('Age'), 'field' => 'age'),
    array('data' => t('Gender'), 'field' => 'gender'),
    array('data' => t('Question'), 'field' => 'question'),
    array('data' => t('Answer'), 'field' => 'answer'),
  );

  // Get a paged list of all the submission data
  $query = db_select('opeka_stats', 'n')
            //->condition('status', 1) //Only published nodes, change condition as it suits you
            ->extend('PagerDefault')     //Pager Extender
                ->limit(50)              //10 results per page
            ->extend('TableSort')        //Sorting Extender
                ->orderByHeader($header)//Field to sort on is picked from $header
            ->fields ('n', array (
                'submission_date',
                'submission_id',
                'age',
                'gender',
                'question',
                'answer',
            ));


  $results = $query->execute();
  $rows = array();
  foreach ($results as $subm) {
    $rows[] = array( 'data' =>
                    array( format_date($subm->submission_date), $subm->submission_id, $subm->age, _opeka_statistics_expand_gender($subm->gender), $subm->question, $subm->answer )
                   );
  }

  $html = theme('table', array( 'header' => $header,
                               'rows'=>$rows,
                               'sticky' => TRUE, //Optional to indicate whether the table headers should be sticky
                               'empty' => 'No screening results yet...', //Optional empty text for the table if resultset is empty
                              )
               );

  $html .= theme('pager', array( 'tags' => array() ) );

  $total = _opeka_statistics_get_total();
  if (!$total) {
    $total = t("None");
  }

  $total_last_month = _opeka_statistics_get_last_month();

  if (!$total_last_month) {
    $total_last_month = t("None");
  }
  $html_pre = "<div><p>".t('Total number of chat sessions: ').$total."</p></div>";
  $html_pre .= "<div><p>".t('Total number of chat sessions last 4 weeks: ').$total_last_month."</p></div>";
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
      $res = t("gender not set");
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
