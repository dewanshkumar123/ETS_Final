# TODO for Modifying Lecture UI to Group by Course

## Step 1: Modify dashboard route in app.py ✅
- Group lectures by course in the dashboard route.
- Pass a dictionary of courses to lectures instead of flat list.

## Step 2: Update dashboard.html template ✅
- Change the template to display courses first.
- For each course, show the course title as a clickable header.
- Under each course, list the lectures, initially hidden.
- Add JavaScript to toggle visibility of lectures when course is clicked.

## Step 3: Handle lectures without course ✅
- Ensure lectures without a 'course' field are grouped under a default category, e.g., "Uncategorized".

## Step 4: Add course_view route and template ✅
- Add a new route `/course/<course_name>` to display lectures for a specific course.
- Create `course.html` template to list lectures in the course.
- Update dashboard.html to link course titles to the course_view for teachers.

## Step 5: Improve lecture view UI ✅
- Reorganize lecture view with chatbot on left side and notes on right side.
- Remove two-column layout for notes and transcript.
- Add toggle button to switch between formatted notes and transcript view.
- Make the layout responsive for mobile devices.

## Step 6: Test the changes ✅
- Run the app and verify that courses are shown first, and clicking reveals lectures.
- Verify that clicking on course titles navigates to the course view page.
- Verify that lecture view shows chatbot on left and notes on right with toggle functionality.
