# ![Showtime](https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Showtime.svg/200px-Showtime.svg.png)
A small project called ShowtimeGram, for the folks over at Showtime / CBS

**Features** (in no particular order):
 - 100% vanilla JavaScript and PHP - No frameworks or libraries used.
 - DOM manipulation performed real-time - no page refreshing.
 - A-synchronous Image uploading and image-rewriting done on the fly.
 - Uploading images rewrites, re-sizes and optimizes the image to preserve disk space.
 - Image rewrite helps validate image integrity.
 - Image resizing performed proportionally for image height versus a 600px width.
 - Validations include file size, image type and overall directory size limits (prevents directory growing too large).
 - Image names are rewritten to include a unique, time-based ID.
 - Detects if SQLlite is installed and creates appropriate database if it doesn't exist.
 - Detects if image directory exists and creates it if it does not. 
 - Checks if proper write permissions exist on upload directory.
 - Unique ID and path are removed from file names when displaying output to user.

