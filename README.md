Overview
=======
This project is the functional prototype for the EDI Mapper application, with the following features:

- both server-side and client-side code are contained in this project
- local development and Heroku deployment are both supported out of the box
- the master branch is currently where developers push code for the team, and the default source for Heroku builds as well

Code Organization
=======
Server-side code follows normal conventions for Play Framework.  The app folder contains the key server-side code.

The client-side code is primarily served from /public.  Once the main index.html file loads, Angular takes over on the client side and handles the rest of the page navigation, html templating, etc.  After that initial index.html load, Angular only makes requests for data and HTML templates.


Heroku Support
==============
This project supports both local development (Windows or Linux) as well as Heroku deployment from the same codebase out of the box. 

To start the local server, cd into the project folder and type "run".  This is a little different than usual for Play Framework, but is done so that the local and Heroku configurations don't clobber each other.

You can also type "test" to run the tests.

When Heroku starts the server, it gets its db configuration from Procfile.
