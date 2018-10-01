<?php

class ShowtimeGram {

	function __construct($data) {
		// # sanitize the entire $_POST input
		$this->data = filter_var_array($data, FILTER_SANITIZE_STRING);
	}

	// # Routing method
	public function processPost() {

		if (empty($this->data)) {
			return $this->errorHandler(1, 'Nothing Sent?!');
		}

		if (!empty($this->data['search'])) {
			return $this->filterResult($this->data['search'], $this->data['page']);
		} else if (isset($this->data['id'])) {
			return $this->deleteEntry($this->data['id']);
		} else {
			return $this->saveEntry($this->data);
		}
	}

	// # begin saving image and title/caption entry
	private function saveEntry($data) {

		// # check if the file is missing
		if (empty($_FILES['files']['name'][0])) {
			return $this->errorHandler(1, 'Missing Upload File!');
		}

		// # process, resize and validate the uploaded filename - add unique id
		$data['filename'] = $this->processFiles();

		// # Error from filename will be in JSON format,
		// # If error, return the response of only filename
		if (strpos($data['filename'], 'Error') !== false) {
			return $data['filename'];
		}

		$filename = 'images/' . $data['filename'];
		$username = $data['username'];
		$caption = $data['caption'];
		$date = date('Y-m-d H:i:s', time());

		// # if any required field is empty, throw an error
		if (empty($username) || empty($caption) || empty($filename)) {
			return $this->errorHandler(1, 'A required field is empty.');
		}

		try {

			// # this assumes the table showgrams already exists
			// # table & database creation performed in instantiate method filterResults()
			$db = new SQLite3('showtime.db');
			
			$sql = "INSERT INTO showgrams VALUES(NULL, '".$username."', '".$caption."','".$filename."','".$date."')";
			
			$db->busyTimeout(2000);

			$db->exec($sql);
			$db->close();

			// # clean up the file name for response / remove unique ID
			$filename = $this->scrubUniqueID($filename);

			// # return the success response
			return $this->parseResponse('2', 'Successfully saved file: ' . $filename);

		} catch(Exception $e) {
			return $this->errorHandler(1, $e);
		}
	}

	// # delete the entry based on ID
	private function deleteEntry($id) {

		// # ensure id is an integer
		$id = filter_var($id, FILTER_VALIDATE_INT);

		// # if id is empty, throw error
		if (empty($id)) {
			return $this->errorHandler(1, 'ID is not properly set.');
		}

		try {

			$db = new SQLite3('showtime.db');

			// # find the filepath based on ID
			$filepath_sql = "SELECT filename FROM showgrams WHERE id='{$id}'";
			$db->busyTimeout(1000);
			$filepath = $db->querySingle($filepath_sql);

			// # if physical image exists on filesystem - delete it
			if (file_exists($filepath)) unlink($filepath);

			// # now delete the entire row from db
			$sql = "DELETE FROM showgrams WHERE id='{$id}'";
			$db->busyTimeout(1000);
			$db->exec($sql);

			$db->close();

			// # clean up the filename for response, removing unique ID
			$filename = $this->scrubUniqueID($filepath);

			// # return the success response
			return $this->parseResponse('2', 'Image ' . $filename . ' Successfully Deleted.');

		}
		catch(Exception $e) {
			return $this->errorHandler(1, $e);
		}
	}

	// # Instantiate method which also filters the displayed results
	private function filterResult($keyword, $page=1) {

		// # sanitize the keyword used in search
		$keyword = filter_var($keyword, FILTER_SANITIZE_STRING);

		// # if no keyword used, return.
		if ($keyword == '') return;

		// # ensure page number is an integer
		$page = filter_var($page, FILTER_VALIDATE_INT);

		// # if page number is empty, throw error
		if (empty($page)) {
			return $this->errorHandler(1, 'Page number is not defined.');
		}

		try {

			// # check if sqllite is installed
			if (!isset(SQLite3::version() ['versionNumber'])) {
				return $this->errorHandler(1, 'SQLite3 not installed!');
			}

			$db = new SQLite3('showtime.db');
			$db->busyTimeout(2000);

			// # check if table exists. if not create it
			$tableCheck = $db->query("SELECT name FROM sqlite_master WHERE name='showgrams'");

			if ($tableCheck->fetchArray() === false) {

				$sql = "CREATE TABLE IF NOT EXISTS showgrams (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							username VARCHAR (255) NOT NULL,
							caption TEXT NOT NULL,
							filename VARCHAR (255) NOT NULL,
							date TEXT NOT NULL
						)";

				$db->busyTimeout(2000);

				$db->exec($sql);
			}

			// # max results page page
			$max_results = 5;

			// # total db rows - very inefficient
			$total_count_sql = "SELECT COUNT(id) FROM showgrams";
			$db->busyTimeout(2000);
			$total_count = $db->querySingle($total_count_sql);

			$page_count = ceil($total_count / $max_results);

			// # if page minus 1 equals zero, set page to 1
			$page = ($page == 0 ? 1 : $page);

			// # if page minus 1 equals zero, set last page as 1
			$last = ($page < 1 == 0 ? 1 : $page < 1);

			$next = ($page+1 > $page_count ? '' : $page +1);

			// # define the offset based on current page number
			$offset = ' OFFSET '. ($page - 1) * $max_results;

			// # Set the range of rows for selected $page number
			$limit = 'LIMIT '.$max_results . $offset;

			// # if keyword is ALL indicator, show all - includes pagination
			if ($keyword !== '*') {

				$sql = "SELECT id, username, caption, filename, date FROM showgrams
						WHERE filename LIKE '%{$keyword}%' OR caption LIKE '%{$keyword}%'
						ORDER BY filename DESC 
						{$limit}
						";
			} else {

				$sql = "SELECT id, username, caption, filename, date FROM showgrams 
						ORDER BY date DESC 
						{$limit}
						";
			}

			$db->busyTimeout(2000);

			$response = $db->query($sql);

			$results = array();

			while ($row = $response->fetchArray(SQLITE3_ASSOC)) {
				$results[] = $row;
			}

			$db->close();

			if (!empty($results)) {

				$results[] = array(
					'pagination' => array(
						'total_count' => $total_count,
						'max_results' => $max_results,
						'current_page' => $page,
						'last_page' => $last,
						'next_page' => $next
						)
					);

				return $this->parseResponse('1', $results);
			} else {
				return $this->parseResponse('3', 'No results found. Please revise search or add an image.');
			}

		} catch(Exception $e) {
			return $this->errorHandler(1, $e);
		}
	}

	// # process and save the uploaded image
	private function processFiles() {

		$path = dirname(__FILE__) . '/images/';

		// # create the images directory if it does not exist.
		if (!file_exists($path)) {
			if (!mkdir($path, 0775, true)) {
				return $this->errorHandler(1, 'Failed to create required image directory.');
			}
		}

		// # double check we have write perms on the path dir
		if (!is_writable($path)) {
			return $this->errorHandler(1, 'The directory path ' . $path . ' is not writable');
		}

		// # allowed file types
		$allowed = array('jpg', 'jpeg', 'png', 'gif');

		$original_name = pathinfo($_FILES['files']['name'][0], PATHINFO_FILENAME);
		$file_tmp = $_FILES['files']['tmp_name'][0];
		$file_size = $_FILES['files']['size'][0];
		$file_ext = pathinfo($_FILES['files']['name'][0], PATHINFO_EXTENSION);
		//$file_type = $_FILES['files']['type'][0];
		$filename = $original_name . '_' . uniqid() . '.' . $file_ext;

		$filepath = $path . $filename;

		// # file type validation
		if (!in_array($file_ext, $allowed)) {
			return $this->errorHandler(1, 'File type ' . $file_ext . ' for file ' . $original_name . '.' . $file_ext . ' not allowed.');
		}

		// # file size validation
		if ($file_size > 2097152) {
			return $this->errorHandler(1, 'File size ' . $file_size . ' bytes for file ' . $original_name . '.' . $file_ext . ' exceeds upload limit.');
		}

		// # limit the maximum allowed size of images directory for the project
		$dir_size = array_sum(array_map('filesize', glob("{$path}/*.*")));
		$dir_limit = 10000000; // 10MB
		if (($dir_size + $file_size) >= $dir_limit) {
			return $this->errorHandler(1, 'File upload will exceed allowable disk limitations of ' . ($dir_limit / 1000000) . 'MB for this project.');
		}

		// # strip path from filename for return purposes
		$filename = str_replace(dirname(__FILE__) . '/', '', $filename);

		// # format the image and save resized version to filesytem
		$this->resizeImg($file_tmp, $filename, $file_ext, 600);

		return $filename;
	}

	private function resizeImg($file_tmp, $filename, $file_type, $newWidth) {

		if (empty($file_tmp)) {
			return $this->errorHandler(1, 'Failed to create required image.');
		}

		$directory = dirname(__FILE__) . '/images/';

		// # define the image quality from 1 to 100
		$quality = 10;

		// # define width and the height of original image
		list($width, $height) = getimagesize($file_tmp);

		// # get the reduced width
		$reduced_width = ($width - $newWidth);
		// # convert the reduced width to a percentage and round it to 2 decimal places
		$reduced_radio = round(($reduced_width / $width) * 100, 2);
		// # reduce the same percentage from the height and round it to 2 decimal places
		$reduced_height = round(($height / 100) * $reduced_radio, 2);
		// # reduce the calculated height from the original height
		$after_height = $height - $reduced_height;

		// # detect the file type
		if ($file_type == 'jpg' || $file_type == 'jpeg') {
			$img = imagecreatefromjpeg($file_tmp);
		} else if ($file_type == 'png') {
			$img = imagecreatefrompng($file_tmp);
		} else if ($file_type == 'gif') {
			$img = imagecreatefromgif($file_tmp);
		} else {
			// # file type is not available
			return $this->errorHandler(1, 'Image type is not supported');
		}

		// # image scale and quality adjustment
		$resizedImg = imagescale($img, $newWidth, $after_height, $quality);

		// # create and save the resized image to file system
		imagejpeg($resizedImg, $directory . '/' . $filename);

		// # free-up memory associated with tmp image
		imagedestroy($img);
		imagedestroy($resizedImg);
	}

	// # clean up the file name for response / remove unique ID
	private function scrubUniqueID($filepath) {

		// # get the parts of the file path
		$file = pathinfo($filepath);

		$filename = $file['basename'];
		$path = $file['dirname'];

		// # if path is a URL, skip removal of unique ID from filename
		if (strpos($path, 'https:') === false || strpos($path, 'https:') === false) {
			$uniqeid = substr(strrchr($file['filename'], "_") , 1);
			$filename = str_replace('_' . $uniqeid, '', $filename);
		}

		return $filename;
	}

	// # some basic json formating of final responses sent to JS
	private function parseResponse($status, $result = '') {

		if ($status == 1) {
			$status = "Success";
		} else if ($status == 2) {
			$status = "Update";
		} else if ($status == 3) {
			$status = "OK";
		}

		$results = json_encode(array("status" => $status, "results" => $result));

		return $results;
	}

	private function errorHandler($status, $message = '') {

		if ($status == 1) {
			$errors = json_encode(array("status" => "Error", "message" => $message));
		}

		//error_log('errors = ' . print_r(json_decode($errors)->message, 1));
		return $errors;
	}
}

/////////////////////////////////////////////////////////////
if (!empty($_POST)) {
	$upload = new ShowtimeGram($_POST);
	echo $upload->processPost();
} else {
	// # show a 404 if file directly accessed via GET method
	return http_response_code(404);
}

?>
