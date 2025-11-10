# TODO: Migrate to Nginx as Webserver with Node.js Backend

## Steps to Complete Migration

- [x] Create nginx.conf configuration file to serve static files from 'public' folder and proxy API requests to Node.js backend on port 3000
- [x] Edit server.js to remove express.static middleware since nginx will handle static file serving
- [x] Provide instructions for installing and configuring nginx (for Windows/Linux)
- [x] Update README.md with new setup instructions for running the application with nginx and Node.js
- [ ] Test the setup to ensure static files are served by nginx and API calls are proxied correctly
