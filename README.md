# Secure Art Gallery
## Project Description

A secure art gallery application that lets users view exhibits and higher-access users view/edit privileged information.

## Team
Alicia Brown & Anna Prack

## Download and Deployment
### Installation
Download the repository

### Database Setup
Docker will create and seed the database when building the container
In terminal type and change the values of DB_PASSWORD, MYSQL_ROOT_PASSWORD, and SESSION_SECRET: 
- cp .env.example .env

### Deployment
In terminal type: 
- docker compose up --build

Enter the host link into a browser to access the site (http://localhost:3000/) or click the link given by the container on Docker Desktop

## Technology Stack

- Frontend: HTML, CSS, Bootstrap, EJS, JS
- Backend: Node, Express
- Database: MySQL
- Authentication: Express sessions/cookies
- Deployment: Docker Compose

## Architecture

Browser → Backend/API → Database

## User Roles:
- Guests, Employees, and Admins - Browse the galleries
- Employees & Admins - View gallery events and view gallery/rom occupancy
- Admins - Edit, create, and delete users

## API Endpoints
Authentication
* Get - "/api/auth/login"
* Post - "/api/auth/login", "/api/auth/logout"


User Management
* Post - "/api/users/", "/api/users/:id/role", "/api/users/:id/delete"


Events
* Post - "/api/events/galleries/:galleryID/enter", "/api/events/galleries/:galleryID/leave", "/api/events/rooms/:roomID/enter", "/api/events/rooms/:roomID/leave", "/api/events/history/reconcile"


Web Pages
* Get - "/", "/login", "/galleries/galleryID", "/rooms/roomID", "/users", "/events", "/audit"

## Testing: 
### Functional Requirements

- All users can access the galleries and rooms
- Employees and Admins can see room occupancy
- Guests are unable to see, access, and edit the events, audit log, and users pages
- Employees are unable to access the audit log page

### Security Requirements

- All passwords are stored securely
- Users are unable to enter galleries/rooms through a URL and can only access the non gallery/room pages if they have the proper access and are on the home page

## Security Controls
- Rate limiting is used to prevent DoS attacks
- User passwords are encrypted before being stored in the database
- Entered values are validated before interacting with the database
- The session is regenerated after a successful login
- SQL queries use parameterized values to reduce risk of SQL injection
- All content is role-restricted
- Session is destroyed on logout and regenerated after login
- CSRF protections are implemented at login to prevent a potential attack

## Known Limitations

- Navigation to all pages must be done from the home page
- When run on http, on user creation the users password is sent over plaintext
